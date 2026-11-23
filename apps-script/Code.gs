function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('SYPT Fight Matrix Generator')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
