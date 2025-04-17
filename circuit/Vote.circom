template Vote() {
  signal private input voterId;
  signal output isEligible;
  var temp;
  temp = 0;
  if(voterId <= 1000 && voterId > 0) {
    temp = 1;
  }
  isEligible <== temp;
 }

component main = Vote();