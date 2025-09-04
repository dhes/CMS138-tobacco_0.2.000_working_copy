library Age version '0.0.1'
using QICore version '6.0.0'

parameter "Measurement Period" Interval<DateTime>  default Interval [DateTime(year from Now(),1,1,0,0,0),DateTime(year from Now(),12,31,23,59,59)]

context Patient

define MP: "Measurement Period"
define "Age At MP Start": AgeInYearsAt(date from start of "Measurement Period")
define "Current Age": AgeInYears()