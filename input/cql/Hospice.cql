library Hospice version '6.15.002'

using QICore version '6.0.0'

include FHIRHelpers version '4.4.000' called FHIRHelpers
include QICoreCommon version '4.0.000' called QICoreCommon
include Status version '1.13.000' called Status

codesystem "LOINC": 'http://loinc.org'
codesystem "SNOMEDCT": 'http://snomed.info/sct'

valueset "Encounter Inpatient": 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.666.5.307'
valueset "Hospice Care Ambulatory": 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.526.3.1584'
valueset "Hospice Encounter": 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1003'
valueset "Hospice Diagnosis": 'http://cts.nlm.nih.gov/fhir/ValueSet/2.16.840.1.113883.3.464.1003.1165'
// valueset "Yes Snomed ValueSet": 'http://example.org/fhir/ValueSet/yes-snomed'

code "Discharge to healthcare facility for hospice care (procedure)": '428371000124100' from "SNOMEDCT" display 'Discharge to healthcare facility for hospice care (procedure)'
code "Discharge to home for hospice care (procedure)": '428361000124107' from "SNOMEDCT" display 'Discharge to home for hospice care (procedure)'
code "Hospice care [Minimum Data Set]": '45755-6' from "LOINC" display 'Hospice care [Minimum Data Set]'
code "Yes (qualifier value)": '373066001' from "SNOMEDCT" display 'Yes (qualifier value)'

parameter "Measurement Period" Interval<DateTime> // default Interval[@2026-01-01T00:00:00, @2026-12-31T23:59:59]

context Patient

define "Has Hospice Services":
  exists "Inpatient Encounter"
    or exists "Encounter Hospice"
    or exists "Hospice Assessment"
    or exists "Hospice Order"
    or exists "Hospice Performed"
    or exists "Hospice Problem Diagnosis"
    or exists "Hospice Encounter Diagnosis"

define "Had Hospice Services":
  exists "Had Inpatient Encounter"
    or exists "Had Encounter Hospice"
    or exists "Had Hospice Assessment"
    or exists "Had Hospice Order"
    or exists "Had Hospice Performed"
    or exists "Had Hospice Problem Diagnosis"
    or exists "Had Hospice Encounter Diagnosis"

define "Inpatient Encounter": 
  ((([Encounter: "Encounter Inpatient"]).isEncounterPerformed()) InpatientEncounter
      where (InpatientEncounter.hospitalization.dischargeDisposition ~ "Discharge to home for hospice care (procedure)"
          or InpatientEncounter.hospitalization.dischargeDisposition ~ "Discharge to healthcare facility for hospice care (procedure)"
      )
        and InpatientEncounter.period.toInterval() ends during day of "Measurement Period"
  )

define "Had Inpatient Encounter": 
  ((([Encounter: "Encounter Inpatient"]).isEncounterPerformed()) InpatientEncounter
      where (InpatientEncounter.hospitalization.dischargeDisposition ~ "Discharge to home for hospice care (procedure)"
          or InpatientEncounter.hospitalization.dischargeDisposition ~ "Discharge to healthcare facility for hospice care (procedure)"
      )
        // and InpatientEncounter.period.toInterval() ends during day of "Measurement Period"
  )

define "Encounter Hospice":
  ((([Encounter: "Hospice Encounter"]).isEncounterPerformed()) HospiceEncounter
        where HospiceEncounter.period.toInterval() overlaps day of "Measurement Period"
    )

define "Had Encounter Hospice":
  ((([Encounter: "Hospice Encounter"]).isEncounterPerformed()) HospiceEncounter
        // where HospiceEncounter.period.toInterval() overlaps day of "Measurement Period"
    )

define "Hospice Assessment":
  ((([ObservationScreeningAssessment: "Hospice care [Minimum Data Set]"]).isAssessmentPerformed()) HospiceAssessment
        // where HospiceAssessment.value ~ "Yes (qualifier value)"
          where HospiceAssessment.effective.toInterval() overlaps day of "Measurement Period"
    )

define "Had Hospice Assessment":
  ((([ObservationScreeningAssessment: "Hospice care [Minimum Data Set]"]).isAssessmentPerformed()) HospiceAssessment
        // where HospiceAssessment.value ~ "Yes (qualifier value)"
          // where HospiceAssessment.effective.toInterval() overlaps day of "Measurement Period"
    )

define "Hospice Order":
  ((([ServiceRequest: "Hospice Care Ambulatory"]).isInterventionOrder()) HospiceOrder
        where HospiceOrder.authoredOn.toInterval() during day of "Measurement Period"
    )
  
define "Had Hospice Order":
  ((([ServiceRequest: "Hospice Care Ambulatory"]).isInterventionOrder()) HospiceOrder
        // where HospiceOrder.authoredOn.toInterval() during day of "Measurement Period"
    )
  
define "Hospice Performed":
  ((([Procedure: "Hospice Care Ambulatory"]).isInterventionPerformed()) HospicePerformed
        where HospicePerformed.performed.toInterval() overlaps day of "Measurement Period"
    )

define "Had Hospice Performed":
  ((([Procedure: "Hospice Care Ambulatory"]).isInterventionPerformed()) HospicePerformed
        // where HospicePerformed.performed.toInterval() overlaps day of "Measurement Period"
    )

define "Hospice Problem Diagnosis": 
  (([ConditionProblemsHealthConcerns: "Hospice Diagnosis"]) HospiceProblemDiagnosis
        where HospiceProblemDiagnosis.prevalenceInterval() overlaps day of "Measurement Period"
    )

define "Had Hospice Problem Diagnosis": 
  (([ConditionProblemsHealthConcerns: "Hospice Diagnosis"]) HospiceProblemDiagnosis
        // where HospiceProblemDiagnosis.prevalenceInterval() overlaps day of "Measurement Period"
    )

define "Hospice Encounter Diagnosis":
  (([ConditionEncounterDiagnosis: "Hospice Diagnosis"]) HospiceEncounterDiagnosis
        where HospiceEncounterDiagnosis.prevalenceInterval() overlaps day of "Measurement Period"
    )

define "Had Hospice Encounter Diagnosis":
  (([ConditionEncounterDiagnosis: "Hospice Diagnosis"]) HospiceEncounterDiagnosis
        // where HospiceEncounterDiagnosis.prevalenceInterval() overlaps day of "Measurement Period"
    )