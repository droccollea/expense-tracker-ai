# Non-functional Testing
Perform non-functional testing of the application or specific features specified in $ARGUMENTS

## Non-functional Tests
The following tests should be performed:
1. Code compliles and all unit tests are passing
2. The app can is preloaded with 1000 daily expenses across the past 3 months and does not crash 
3. Input fields are fuzz tested to accept only sensible inputs
4. Large dollar volumes expenses are accepted up to $999,999.99
5. Under load, all screens will render within 3 seconds
6. The screens are responsive and will render fully on common mobile and tablet displays
7. All fields should be accessible
8. Other recommended non-functional testing

## Report
- The output of the tests should be summarized in a report "docs/reports/NFT-report-YYYY-MM-DD"
- The report should state the tests performed
- The report should list areas of concern with screenshots where appropriate
- The report should conclude with a recommendations section