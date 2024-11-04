function downloadAndPopulateCSV() {
  var url = 'add your api call url here';
  var token = 'addyourtokenhere'; // Replace with your actual token

  var options = {
    'method': 'get',
    'headers': {
      'Accept': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    'muteHttpExceptions': true
  };

  try {
    // Step 1: Initiate the task by calling the initial endpoint
    var response = UrlFetchApp.fetch(url, options);
    var jsonResponse = JSON.parse(response.getContentText());

    // Extract the task ID
    var taskId = jsonResponse.id;
    Logger.log('Task initiated. ID: ' + taskId);

    // Step 2: Poll the file processor endpoint using the task ID
    var fileProcessorUrl = 'https://backend.podscribe.ai/api/public/file-processor/status/' + taskId;
    var maxAttempts = 10; // Maximum number of polling attempts
    var attempt = 0;
    var fileProcessorResponse;

    do {
      fileProcessorResponse = UrlFetchApp.fetch(fileProcessorUrl, options);
      var fileProcessorJson = JSON.parse(fileProcessorResponse.getContentText());

      if (fileProcessorJson.status === 'done') {
        // Step 3: Fetch the CSV once the status is 'done'
        var csvUrl = fileProcessorJson.url;
        var csvResponse = UrlFetchApp.fetch(csvUrl);
        var csvData = csvResponse.getContentText();

        // Step 4: Open the CSV in Google Sheets
        openCSVInGoogleSheets(csvData);
        return;
      } else {
        Logger.log('CSV is not ready yet, waiting...');
        Utilities.sleep(15000); // Wait 15 seconds before checking again
        attempt++;
      }
    } while (fileProcessorJson.status !== 'done' && attempt < maxAttempts);

    Logger.log('CSV was not ready after ' + maxAttempts + ' attempts.');

  } catch (error) {
    Logger.log('Error: ' + error.toString());
  }
}

function openCSVInGoogleSheets(csvData) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  if (!sheet) {
    Logger.log('Sheet "Sheet1" not found.');
    return;
  }
  var csvArray = Utilities.parseCsv(csvData);
  sheet.clear(); // Clear any existing content
  sheet.getRange(1, 1, csvArray.length, csvArray[0].length).setValues(csvArray);
}

function addRefresherToMenuBar() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Podscribe")
    .addItem('Resync', "downloadAndPopulateCSV")
    .addToUi();
}
