package com.healthsyncapp

import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Energy
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.temporal.ChronoUnit
import java.util.*

@RequiresApi(Build.VERSION_CODES.O)
class HealthModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val healthConnectClient by lazy { HealthConnectClient.getOrCreate(reactContext) }

    override fun getName(): String = "HealthModule"

    private fun sendEvent(reactContext: ReactContext, eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        if (!isHealthConnectAvailable(reactApplicationContext)) {
            promise.reject("HEALTH_CONNECT_UNAVAILABLE", "Health Connect is not available on this device")
            return
        }

        val permissions = setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class)
        )

        healthConnectClient.permissionController.getGrantedPermissions(permissions)
            .addOnSuccessListener { grantedPermissions ->
                val result = Arguments.createMap().apply {
                    putBoolean("steps", grantedPermissions.contains(HealthPermission.getReadPermission(StepsRecord::class)))
                    putBoolean("heartRate", grantedPermissions.contains(HealthPermission.getReadPermission(HeartRateRecord::class)))
                    putBoolean("sleep", grantedPermissions.contains(HealthPermission.getReadPermission(SleepSessionRecord::class)))
                }
                promise.resolve(result)
            }
            .addOnFailureListener { exception ->
                promise.reject("PERMISSION_CHECK_FAILED", "Failed to check permissions", exception)
            }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        if (!isHealthConnectAvailable(reactApplicationContext)) {
            promise.reject("HEALTH_CONNECT_UNAVAILABLE", "Health Connect is not available on this device")
            return
        }

        val permissions = setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class)
        )

        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No current activity available")
            return
        }

        healthConnectClient.permissionController.createRequestPermissionResultContract()
            .createIntent(activity, permissions)
            .let { activity.startActivityForResult(it, HEALTH_CONNECT_PERMISSION_REQUEST_CODE) }

        // In a real app, you'd need to handle the activity result to know if permissions were granted
        // For simplicity, we'll just resolve with the current permissions
        checkPermissions(promise)
    }

    @ReactMethod
    fun fetchHealthData(promise: Promise) {
        if (!isHealthConnectAvailable(reactApplicationContext)) {
            promise.reject("HEALTH_CONNECT_UNAVAILABLE", "Health Connect is not available on this device")
            return
        }

        val end = Instant.now()
        val start = end.minus(1, ChronoUnit.DAYS)
        val timeRange = TimeRangeFilter.between(start, end)

        // Fetch steps
        val stepsRequest = ReadRecordsRequest(
            recordType = StepsRecord::class,
            timeRangeFilter = timeRange
        )

        // Fetch heart rate
        val heartRateRequest = ReadRecordsRequest(
            recordType = HeartRateRecord::class,
            timeRangeFilter = timeRange
        )

        // Fetch sleep
        val sleepRequest = ReadRecordsRequest(
            recordType = SleepSessionRecord::class,
            timeRangeFilter = timeRange
        )

        var totalSteps = 0
        var avgHeartRate = 0.0
        var heartRateCount = 0
        var totalSleepHours = 0.0

        healthConnectClient.readRecords(stepsRequest)
            .addOnSuccessListener { stepsResponse ->
                totalSteps = stepsResponse.records.sumOf { it.count }

                healthConnectClient.readRecords(heartRateRequest)
                    .addOnSuccessListener { heartRateResponse ->
                        heartRateCount = heartRateResponse.records.size
                        avgHeartRate = if (heartRateCount > 0) {
                            heartRateResponse.records.map { it.beatsPerMinute }.average()
                        } else {
                            0.0
                        }

                        healthConnectClient.readRecords(sleepRequest)
                            .addOnSuccessListener { sleepResponse ->
                                totalSleepHours = sleepResponse.records.sumOf {
                                    Duration.between(it.startTime, it.endTime).toMinutes() / 60.0
                                }

                                val result = Arguments.createMap().apply {
                                    putInt("steps", totalSteps)
                                    putDouble("heartRate", avgHeartRate)
                                    putDouble("sleepHours", totalSleepHours)
                                    putString("lastUpdated", ZonedDateTime.now().toString())
                                }
                                promise.resolve(result)
                            }
                            .addOnFailureListener { exception ->
                                promise.reject("SLEEP_DATA_FAILED", "Failed to fetch sleep data", exception)
                            }
                    }
                    .addOnFailureListener { exception ->
                        promise.reject("HEART_RATE_DATA_FAILED", "Failed to fetch heart rate data", exception)
                    }
            }
            .addOnFailureListener { exception ->
                promise.reject("STEPS_DATA_FAILED", "Failed to fetch steps data", exception)
            }
    }

    private fun isHealthConnectAvailable(context: Context): Boolean {
        return try {
            HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
        } catch (e: Exception) {
            false
        }
    }

    companion object {
        const val HEALTH_CONNECT_PERMISSION_REQUEST_CODE = 1001
    }
}