const DriveWealth = require('drivewealth-back-office-javascript');
const fs = require('fs');

async function getUATInstrumentsList() {

    DriveWealth.setup({
        appKey: process.env.UAT_APP_KEY,
        appVersion: "0",
        env: {
            api: process.env.UAT_URL
        },
        httpImpl: require('./node_modules/drivewealth-back-office-javascript/lib/httpImpls/request.js')
    });

    const res = await DriveWealth.Auth.login(process.env.UAT_USERNAME, process.env.UAT_PASSWORD);
    if(res) {
        console.log('Sucessfully Connected To DriveWealth UAT APIs');
    }

    const uatInstruments = await DriveWealth.Instrument.getAll();

    return uatInstruments.filter(instrument => instrument.status != 'INACTIVE' && instrument.type === 'EQUITY');
}

async function getFundamentals(instrumentID){
    try {
        const instrumentFundamentals =  await DriveWealth.request({
            method: "GET",
            endpoint: `/instruments/${instrumentID}?options=Fundamentals`
        });
        return instrumentFundamentals;
    } catch(error){
        console.log(error);
        return null;
    };
}

// remove quotations from response keys
const removeQuotesFromKeys = (obj) => {
    const newObj = {};
    Object.keys(obj).forEach((key) => {
      newObj[key.replace(/"/g, "")] = obj[key];
    });
    return newObj;
  };

  // remove commas from data
  const removeCommasFromValues = (fundamantals) => {
    for (const key in fundamantals) {
        if (typeof fundamantals[key] === 'string') {
            fundamantals[key] = fundamantals[key].replace(/,/g, '');
        }
    }
  }


//   Convert json to CSV
const convertToCSV = (data) => {
    const csvRows = [];
    const keys = Object.keys(data[0]);
  
    csvRows.push(keys.join(','));

    data.forEach((item) => {
      const values = Object.values(item);
      csvRows.push(values.join(','));
    });
  
    return csvRows.join('\n');
  };


// Get 
async function start(){

    var fundamentalsArray = []

    const instruments = await getUATInstrumentsList();
    for(i=0; i<instruments.length; i++){
        console.log(`Process ${i} out of ${instruments.length}`);
        const fundamentals = await getFundamentals(instruments[i].id);

        if(fundamentals){

            let fundamentalsBody = fundamentals.body;
            removeCommasFromValues(fundamentalsBody);
            
            let newFundamentalsObject = {
                symbol: fundamentalsBody.symbol,
                name: fundamentalsBody.name,
                reutersPrimaryRic: fundamentalsBody.reutersPrimaryRic,
                id: fundamentalsBody.id,
                sector: fundamentalsBody.sector,
                industry: fundamentalsBody.industry,
                trbc2012: fundamentalsBody.trbc2012,
                ISIN: fundamentalsBody.ISIN,
                CUSIP: fundamentalsBody.CUSIP
            };

            // console.log(newFundamentalsObject);
            fundamentalsArray.push(newFundamentalsObject);
            // break;
        }
    }
    const csvData = await convertToCSV(fundamentalsArray);
    fs.writeFileSync('data.csv', csvData);
    console.log('CSV file has been created.');
    await new Promise(resolve => setTimeout(resolve, 50));
}


start()



