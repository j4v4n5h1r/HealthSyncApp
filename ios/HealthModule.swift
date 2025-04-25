import Foundation
import HealthKit
import React

@objc(HealthModule)
class HealthModule: NSObject {
    private let healthStore = HKHealthStore()
    private let dateFormatter = ISO8601DateFormatter()
    
    @objc static func requiresMainQueueSetup() -> Bool { return true }
    
    // MARK: - Permission Methods
    
    @objc func checkPermissions(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard HKHealthStore.isHealthDataAvailable() else {
            reject("HEALTH_DATA_UNAVAILABLE", "Health data is not available on this device", nil)
            return
        }
        
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        ]
        
        var result: [String: Any] = [:]
        var allGranted = true
        
        for type in typesToRead {
            let status = healthStore.authorizationStatus(for: type)
            let isAuthorized = status == .sharingAuthorized
            result[type.identifier] = isAuthorized
            if !isAuthorized {
                allGranted = false
            }
        }
        
        resolve([
            "steps": result[HKQuantityTypeIdentifier.stepCount.rawValue] ?? false,
            "heartRate": result[HKQuantityTypeIdentifier.heartRate.rawValue] ?? false,
            "sleep": result[HKCategoryTypeIdentifier.sleepAnalysis.rawValue] ?? false,
            "allGranted": allGranted
        ])
    }
    
    @objc func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard HKHealthStore.isHealthDataAvailable() else {
            reject("HEALTH_DATA_UNAVAILABLE", "Health data is not available on this device", nil)
            return
        }
        
        guard let stepCountType = HKObjectType.quantityType(forIdentifier: .stepCount),
              let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate),
              let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            reject("TYPE_ERROR", "Could not initialize health data types", nil)
            return
        }
        
        let typesToRead: Set<HKObjectType> = [stepCountType, heartRateType, sleepType]
        
        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
            if let error = error {
                reject("PERMISSION_ERROR", error.localizedDescription, error)
                return
            }
            
            // Return the current permission status after request
            self.checkPermissions(resolve, reject: reject)
        }
    }
    
    // MARK: - Data Fetching Methods
    
    @objc func fetchHealthData(_ startDate: String, endDate: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard HKHealthStore.isHealthDataAvailable() else {
            reject("HEALTH_DATA_UNAVAILABLE", "Health data is not available on this device", nil)
            return
        }
        
        guard let start = dateFormatter.date(from: startDate),
              let end = dateFormatter.date(from: endDate) else {
            reject("DATE_ERROR", "Invalid date format. Use ISO8601", nil)
            return
        }
        
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        
        let dispatchGroup = DispatchGroup()
        var stepsData: [[String: Any]] = []
        var heartRateData: [[String: Any]] = []
        var sleepData: [[String: Any]] = []
        var fetchError: Error?
        
        // Fetch Steps
        dispatchGroup.enter()
        fetchSteps(start: start, end: end, predicate: predicate) { result in
            switch result {
            case .success(let steps):
                stepsData = steps
            case .failure(let error):
                fetchError = error
            }
            dispatchGroup.leave()
        }
        
        // Fetch Heart Rate
        dispatchGroup.enter()
        fetchHeartRate(start: start, end: end, predicate: predicate) { result in
            switch result {
            case .success(let hrData):
                heartRateData = hrData
            case .failure(let error):
                fetchError = error
            }
            dispatchGroup.leave()
        }
        
        // Fetch Sleep
        dispatchGroup.enter()
        fetchSleep(start: start, end: end, predicate: predicate) { result in
            switch result {
            case .success(let sleep):
                sleepData = sleep
            case .failure(let error):
                fetchError = error
            }
            dispatchGroup.leave()
        }
        
        dispatchGroup.notify(queue: .main) {
            if let error = fetchError {
                reject("DATA_FETCH_FAILED", "Failed to fetch health data", error)
            } else {
                resolve([
                    "steps": stepsData,
                    "heartRate": heartRateData,
                    "sleep": sleepData
                ])
            }
        }
    }
    
    @objc func getTodaySteps(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let now = Date()
        let startOfDay = Calendar.current.startOfDay(for: now)
        
        fetchSteps(start: startOfDay, end: now, predicate: nil) { result in
            switch result {
            case .success(let steps):
                let totalSteps = steps.reduce(0) { $0 + ($1["value"] as? Int ?? 0) }
                resolve(totalSteps)
            case .failure(let error):
                reject("STEPS_ERROR", "Failed to get today's steps", error)
            }
        }
    }
    
    // MARK: - Private Helper Methods
    
    private func fetchSteps(start: Date, end: Date, predicate: NSPredicate?, completion: @escaping (Result<[[String: Any]], Error>) -> Void) {
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            completion(.failure(NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Step count type not available"]))
            return
        }
        
        let queryPredicate = predicate ?? HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let query = HKStatisticsCollectionQuery(
            quantityType: stepType,
            quantitySamplePredicate: queryPredicate,
            options: .cumulativeSum,
            anchorDate: start,
            intervalComponents: DateComponents(minute: 1)
        )
        
        query.initialResultsHandler = { query, results, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            var steps: [[String: Any]] = []
            results?.enumerateStatistics(from: start, to: end) { statistic, _ in
                if let sum = statistic.sumQuantity() {
                    steps.append([
                        "value": Int(sum.doubleValue(for: HKUnit.count())),
                        "startDate": self.dateFormatter.string(from: statistic.startDate),
                        "endDate": self.dateFormatter.string(from: statistic.endDate)
                    ])
                }
            }
            
            completion(.success(steps))
        }
        
        healthStore.execute(query)
    }
    
    private func fetchHeartRate(start: Date, end: Date, predicate: NSPredicate?, completion: @escaping (Result<[[String: Any]], Error>) -> Void) {
        guard let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
            completion(.failure(NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Heart rate type not available"]))
            return
        }
        
        let queryPredicate = predicate ?? HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        
        let query = HKSampleQuery(
            sampleType: heartRateType,
            predicate: queryPredicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sortDescriptor]
        ) { _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let samples = samples as? [HKQuantitySample] else {
                completion(.success([]))
                return
            }
            
            let heartRates = samples.map { sample -> [String: Any] in
                return [
                    "value": sample.quantity.doubleValue(for: HKUnit(from: "count/min")),
                    "startDate": self.dateFormatter.string(from: sample.startDate),
                    "endDate": self.dateFormatter.string(from: sample.endDate)
                ]
            }
            
            completion(.success(heartRates))
        }
        
        healthStore.execute(query)
    }
    
    private func fetchSleep(start: Date, end: Date, predicate: NSPredicate?, completion: @escaping (Result<[[String: Any]], Error>) -> Void) {
        guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            completion(.failure(NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Sleep analysis type not available"]))
            return
        }
        
        let queryPredicate = predicate ?? HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        
        let query = HKSampleQuery(
            sampleType: sleepType,
            predicate: queryPredicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [sortDescriptor]
        ) { _, samples, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let samples = samples as? [HKCategorySample] else {
                completion(.success([]))
                return
            }
            
            let sleepPeriods = samples.compactMap { sample -> [String: Any]? in
                // Only include actual sleep (not inBed)
                guard sample.value == HKCategoryValueSleepAnalysis.asleep.rawValue else {
                    return nil
                }
                
                return [
                    "startDate": self.dateFormatter.string(from: sample.startDate),
                    "endDate": self.dateFormatter.string(from: sample.endDate),
                    "duration": sample.endDate.timeIntervalSince(sample.startDate) / 3600.0 // hours
                ]
            }
            
            completion(.success(sleepPeriods))
        }
        
        healthStore.execute(query)
    }
}