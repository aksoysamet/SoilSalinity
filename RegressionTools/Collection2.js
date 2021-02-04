/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var l8 = ee.ImageCollection("LANDSAT/LC08/C01/T1_SR"),
    s2 = ee.ImageCollection("COPERNICUS/S2");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var PCA = require("users/aksoysamett/urmia_surface_class:RegressionTools/PCA.js");
var TC = require("users/aksoysamett/urmia_surface_class:RegressionTools/TasseledCap.js");

var L8Bands = ["B2","B3","B4","B5","B6","B7"];
var S2Bands = ["B2","B3","B4","B8","B11","B12"];

var scale;
var sPlatform;

var bandNames = ["BLUE","GREEN","RED","NIR","SWIR1","SWIR2"]
function getImage(platform, aoi, sDate, eDate){
  var col, img;
  sPlatform = platform;
  if(platform == "L8") {
    col = l8.filterBounds(aoi).filterDate(sDate, eDate).sort("CLOUD_COVER");
    print(col.first())
    img = ee.Image(col.first()).select(L8Bands, bandNames).multiply(0.0001).double();
    scale = 30;
  }else if(platform == "S2") {
    col = s2.filterBounds(aoi).filterDate(sDate, eDate).sort("CLOUDY_PIXEL_PERCENTAGE");
    print(col.first())
    img = ee.Image(col.first()).select(S2Bands, bandNames).multiply(0.0001).double();
    scale = 10;
  }
  return img;
}
//Landsat Derived
function getPCA(img) {return PCA.getPCA(img, scale)}
function getTC(img) {return sPlatform == "L8" ? TC.TasseledCapL8(img) : TC.TasseledCapS2(img)}

//Soil-related indices (SI)
function getSI1(img) {return img.expression("sqrt(i.BLUE*i.RED)", {i:img}).rename("SI1")}
function getSI2(img) {return img.expression("sqrt(i.GREEN*i.RED)", {i:img}).rename("SI2")}
function getSI3(img) {return img.expression("sqrt((i.GREEN*i.GREEN) + (i.RED*i.RED))", {i:img}).rename("SI3")}
function getSI4(img) {return img.expression("(i.BLUE*i.RED)/i.GREEN", {i:img}).rename("SI4")}
function getSI5(img) {return img.expression("(i.GREEN+i.RED)/2", {i:img}).rename("SI5")}
function getSI(img) {return getSI1(img).addBands(getSI2(img)).addBands(getSI3(img)).addBands(getSI4(img)).addBands(getSI5(img)).addBands(getTahaSI(img))}
function getTahaSI(img) {return img.expression("(i.BLUE*i.RED)/abs(i.NIR-i.RED)", {'i': img}).rename("SI")}

//Vegetation indices (VD)
function getNDVI(img) {return img.normalizedDifference(["NIR", "RED"]).rename("NDVI")}
function getSAVI(img) {return img.expression("((i.NIR-i.RED)*(1+L))/(i.NIR+i.RED+L)", {i:img, L:0.5}).rename("SAVI")}
function getEVI(img) {return img.expression("((2.5)*(i.NIR-i.RED))/(i.NIR+(6*i.RED)-(7.5*i.BLUE))", {i:img}).rename("EVI")}
function getGDVI(img) {return img.expression("(i.NIR**2 - i.RED**2)/(i.NIR**2 + i.RED**2)", {i:img}).rename("GDVI")}
function getCRSI(img) {return img.expression("((i.NIR*i.RED) - (i.GREEN*i.BLUE))/((i.NIR*i.RED) + (i.GREEN*i.BLUE))", {i:img}).rename("CRSI")}
function getSR(img) {return img.expression("i.NIR/i.RED", {i:img}).rename("SR")}
function getEVI2(img) {return img.expression("((2.5)*(i.NIR-i.RED))/(i.NIR+(2.4*i.RED)-1)", {i:img}).rename("EVI2")}
function getENDVI(img) {return img.expression("(i.NIR + i.SWIR2 - i.RED)/(i.NIR + i.SWIR2 + i.RED)", {i:img}).rename("ENDVI")}
function getEEVI(img) {return img.expression("2.5*(i.NIR + i.SWIR1 - i.RED)/(i.NIR + 2.5*(i.SWIR1 + 6*i.NIR + i.RED - 7.5*i.SWIR1 - i.RED)*i.BLUE + 1)", {i:img}).rename("EEVI")}

function getVD(img){
  return getNDVI(img)
  .addBands(getSAVI(img))
  .addBands(getEVI(img))
  .addBands(getGDVI(img))
  .addBands(getCRSI(img))
  .addBands(getSR(img))
  .addBands(getEVI2(img))
  .addBands(getENDVI(img))
  .addBands(getEEVI(img))
}


function getNDWI(img) {return img.normalizedDifference(["GREEN", "NIR"]).rename("NDWI")}

function getBase(img) {return img.addBands(getPCA(img)).addBands(getTC(img))}

function getALL(img) {return getBase(img).addBands(getSI(img)).addBands(getVD(img))}

exports.getImage = getImage
exports.getSI1   = getSI1
exports.getSI2   = getSI2
exports.getSI3   = getSI3
exports.getSI4   = getSI4
exports.getSI5   = getSI5
exports.getPCA   = getPCA
exports.getTC    = getTC

exports.getTahaSI= getTahaSI

exports.getNDVI  = getNDVI
exports.getSAVI  = getSAVI
exports.getEVI   = getEVI
exports.getGDVI  = getGDVI
exports.getCRSI  = getCRSI
exports.getSR    = getSR
exports.getEVI2  = getEVI2
exports.getENDVI = getENDVI
exports.getEEVI  = getEEVI

exports.getNDWI  = getNDWI

exports.getBase  = getBase
exports.getSI    = getSI
exports.getVD    = getVD
exports.getALL   = getALL