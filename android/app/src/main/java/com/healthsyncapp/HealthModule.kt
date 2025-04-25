package com.healthsyncapp

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Energy
import com.facebook.react.bridge.*
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.temporal.ChronoUnit

class HealthModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val healthConnectClient: HealthConnectClient? by lazy {
        if (isHealthConnectAvailable(reactContext)) {
            HealthConnectClient.getOrCreate(reactContext)
        } else {
            null
        }
    }

    override fun getName(): String = "HealthModule"

    private fun isHealthConnectAvailable(context: Context): Boolean {
        return try {
            HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE
        } catch (e: Exception) {
            false
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        if (healthConnectClient == null) {
            promise.reject("HEALTH_CONNECT_UNAVAILABLE", "Health Connect is not available")
            return
        }

        val permissions = setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class)
        )

        healthConnectClient!!.permissionController.getGrantedPermissions(permissions)
            .addOnSuccessListener { granted ->
                val result = Arguments.createMap().apply {
                    putBoolean("steps", granted.contains(permissions.elementAt(0)))
                    putBoolean("heartRate", granted.contains(permissions.elementAt(1)))
                    putBoolean("sleep", granted.contains(permissions.elementAt(2)))
                    putBoolean("allGranted", granted.containsAll(permissions))
                }
                promise.resolve(result)
            }
            .addOnFailureListener { e ->
                promise.reject("PERMISSION_CHECK_FAILED", "Failed to check permissions", e)
            }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        if (healthConnectClient == null) {
            promise.reject("HEALTH_CONNECT_UNAVAILABLE", "Health Connect is not available")
            return
        }

        val activity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "No current activity available")
            return
        }

        val permissions = setOf(
            HealthPermission.getReadPermission(StepsRecord::class),
            HealthPermission.getReadPermission(HeartRateRecord::class),
            HealthPermission.getReadPermission(SleepSessionRecord::class)
        )

        try {
            healthConnectClient!!.permissionController.requestPermissions(activity, permissions)
                .addOnSuccessListener { granted ->
                    val result = Arguments.createMap().apply {
                        putBoolean("steps", granted.contains(permissions.elementAt(0)))
                        putBoolean("heartRate", granted.contains(permissions.elementAt(1)))
                        putBoolean("sleep", granted.contains(permissions.elementAt(2)))
                        putBoolean("allGranted", granted.containsAll(permissions))
                    }
                    promise.resolve(result)
                }
                .addOnFailureListener { e ->
                    promise.reject("PERMISSION_REQUEST_FAILED", "Failed to request permissions", e)
                }
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Permission request failed", e)
        }
    }

    @ReactMethod
    fun fetchHealthData(startDate: String, endDate: String, promise: Promise) {
        if (healthConnectClient == null) {
            promise.reject("HEALTH_CONNECT_UNAVAILABLE", "Health Connect is not available")
            return
        }

        try {
            val start = Instant.parse(startDate)
            val end = Instant.parse(endDate)
            val timeRange = TimeRangeFilter.between(start, end)

            val stepsRequest = healthConnectClient!!.readRecords(
                ReadRecordsRequest(
                    StepsRecord::class,
                    timeRangeFilter = timeRange
                )
            )

            val heartRateRequest = healthConnectClient!!.readRecords(
                ReadRecordsRequest(
                    HeartRateRecord::class,
                    timeRangeFilter = timeRange
                )
            )

            val sleepRequest = healthConnectClient!!.readRecords(
                ReadRecordsRequest(
                    SleepSessionRecord::class,
                    timeRangeFilter = timeRange
                )
            )

            kotlinx.coroutines.GlobalScope.launch(reactContext.coroutineExceptionHandler) {
                try {
                    val stepsResponse = stepsRequest.await()
                    val heartRateResponse = heartRateRequest.await()
                    val sleepResponse = sleepRequest.await()

                    val result = Arguments.createMap().apply {
                        val stepsArray = Arguments.createArray()
                        stepsResponse.records.forEach { record ->
                            val stepMap = Arguments.createMap().apply {
                                putInt("count", record.count)
                                putString("startTime", record.startTime.toString())
                                putString("endTime", record.endTime.toString())
                            }
                            stepsArray.pushMap(stepMap)
                        }
                        putArray("steps", stepsArray)

                        val heartRateArray = Arguments.createArray()
                        heartRateResponse.records.forEach { record ->
                            val hrMap = Arguments.createMap().apply {
                                putDouble("bpm", record.beatsPerMinute)
                                putString("time", record.time.toString())
                            }
                            heartRateArray.pushMap(hrMap)
                        }
                        putArray("heartRate", heartRateArray)

                        val sleepArray = Arguments.createArray()
                        sleepResponse.records.forEach { record ->
                            val sleepMap = Arguments.createMap().apply {
                                putString("startTime", record.startTime.toString())
                                putString("endTime", record.endTime.toString())
                                putString("stage", record.stage.name)
                            }
                            sleepArray.pushMap(sleepMap)
                        }
                        putArray("sleep", sleepArray)
                    }

                    promise.resolve(result)
                } catch (e: Exception) {
                    promise.reject("DATA_FETCH_FAILED", "Failed to fetch health data", e)
                }
            }
        } catch (e: Exception) {
            promise.reject("INVALID_DATE_FORMAT", "Invalid date format", e)
        }
    }

    @ReactMethod
    fun getTodaySteps(promise: Promise) {
        if (healthConnectClient == null) {
            promise.reject("HC_UNAVAILABLE", "Health Connect not available")
            return
        }

        val now = Instant.now()
        val startOfDay = now.atZone(ZoneId.systemDefault()).toLocalDate().atStartOfDay(ZoneId.systemDefault()).toInstant()

        healthConnectClient!!.readRecords(
            ReadRecordsRequest(
                StepsRecord::class,
                timeRangeFilter = TimeRangeFilter.between(startOfDay, now)
            )
        ).addOnSuccessListener { response ->
            val totalSteps = response.records.sumOf { it.count }
            promise.resolve(totalSteps)
        }.addOnFailureListener { error ->
            promise.reject("STEPS_ERROR", "Failed to get steps", error)
        }
    }
}