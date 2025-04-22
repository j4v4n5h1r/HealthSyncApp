import Foundation
import HealthKit
import React

@objc(HealthModule)
class HealthModule: NSObject {
  private let healthStore = HKHealthStore()
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
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
    
    healthStore.getRequestStatusForAuthorization(toShare: [], read: typesToRead) { status, error in
      if let error = error {
        reject("PERMISSION_CHECK_FAILED", "Failed to check permissions", error)
        return
      }
      
      var result: [String: Bool] = [:]
      
      for type in typesToRead {
        let status = self.healthStore.authorizationStatus(for: type)
        result[type.identifier] = status == .sharingAuthorized
      }
      
      resolve([
        "steps": result[HKQuantityTypeIdentifier.stepCount.rawValue] ?? false,
        "heartRate": result[HKQuantityTypeIdentifier.heartRate.rawValue] ?? false,
        "sleep": result[HKCategoryTypeIdentifier.sleepAnalysis.rawValue] ?? false
      ])
    }
  }
  
  @objc func requestPermissions(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard HKHealthStore.isHealthDataAvailable() else {
      reject("HEALTH_DATA_UNAVAILABLE", "Health data is not available on this device", nil)
      return
    }
    
    let typesToRead: Set<HKObjectType> = [
      HKObjectType.quantityType(forIdentifier: .stepCount)!,
      HKObjectType.quantityType(forIdentifier: .heartRate)!,
      HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
    ]
    
    healthStore.requestAuthorization(toShare: nil, read: typesToRead) { success, error in
      if let error = error {
        reject("PERMISSION_REQUEST_FAILED", "Failed to request permissions", error)
        return
      }
      
      self.checkPermissions(resolve, reject: reject)
    }
  }
  
  @objc func fetchHealthData(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
    guard HKHealthStore.isHealthDataAvailable() else {
      reject("HEALTH_DATA_UNAVAILABLE", "Health data is not available on this device", nil)
      return
    }
    
    let group = DispatchGroup()
    var steps = 0
    var heartRate = 0.0
    var sleepHours = 0.0
    var errorOccurred: Error?
    
    // Fetch steps
    group.enter()
    fetchStepCount { result in
      switch result {
      case .success(let count):
        steps = Int(count)
      case .failure(let error):
        errorOccurred = error
      }
      group.leave()
    }
    
    // Fetch heart rate
    group.enter()
    fetchHeartRate { result in
      switch result {
      case .success(let rate):
        heartRate = rate
      case .failure(let error):
        errorOccurred = error
      }
      group.leave()
    }
    
    // Fetch sleep
    group.enter()
    fetchSleepHours { result in
      switch result {
      case .success(let hours):
        sleepHours = hours
      case .failure(let error):
        errorOccurred = error
      }
      group.leave()
    }
    
    group.notify(queue: .main) {
      if let error = errorOccurred {
        reject("HEALTH_DATA_FETCH_FAILED", "Failed to fetch health data", error)
      } else {
        resolve([
          "steps": steps,
          "heartRate": heartRate,
          "sleepHours": sleepHours,
          "lastUpdated": ISO8601DateFormatter().string(from: Date())
        ])
      }
    }
  }
  
  private func fetchStepCount(completion: @escaping (Result<Double, Error>) -> Void) {
    guard let stepCountType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
      completion(.failure(NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Step count type not available"])))
      return
    }
    
    let now = Date()
    let startOfDay = Calendar.current.startOfDay(for: now)
    let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
    
    let query = HKStatisticsQuery(quantityType: stepCountType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
      if let error = error {
        completion(.failure(error))
        return
      }
      
      let count = result?.sumQuantity()?.doubleValue(for: HKUnit.count()) ?? 0
      completion(.success(count))
    }
    
    healthStore.execute(query)
  }
  
  private func fetchHeartRate(completion: @escaping (Result<Double, Error>) -> Void) {
    guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
      completion(.failure(NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Heart rate type not available"])))
      return
    }
    
    let now = Date()
    let startOfDay = Calendar.current.startOfDay(for: now)
    let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
    let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
    
    let query = HKSampleQuery(sampleType: heartRateType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sortDescriptor]) { _, samples, error in
      if let error = error {
        completion(.failure(error))
        return
      }
      
      guard let samples = samples as? [HKQuantitySample], !samples.isEmpty else {
        completion(.success(0.0))
        return
      }
      
      let rates = samples.map { $0.quantity.doubleValue(for: HKUnit(from: "count/min")) }
      let average = rates.reduce(0, +) / Double(rates.count)
      completion(.success(average))
    }
    
    healthStore.execute(query)
  }
  
  private func fetchSleepHours(completion: @escaping (Result<Double, Error>) -> Void) {
    guard let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
      completion(.failure(NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Sleep analysis type not available"])))
      return
    }
    
    let now = Date()
    let startOfDay = Calendar.current.startOfDay(for: now)
    let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
    let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
    
    let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [sortDescriptor]) { _, samples, error in
      if let error = error {
        completion(.failure(error))
        return
      }
      
      guard let samples = samples as? [HKCategorySample] else {
        completion(.success(0.0))
        return
      }
      
      let totalSleep = samples.reduce(0.0) { total, sample in
        if sample.value == HKCategoryValueSleepAnalysis.asleep.rawValue {
          return total + sample.endDate.timeIntervalSince(sample.startDate)
        }
        return total
      }
      
      completion(.success(totalSleep / 3600.0)) // Convert seconds to hours
    }
    
    healthStore.execute(query)
  }
}