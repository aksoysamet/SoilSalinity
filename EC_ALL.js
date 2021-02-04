/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var exportGeometry = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[45.19441304217305, 37.52485683321957],
          [45.19441304217305, 37.39513636896069],
          [45.36126790057149, 37.39513636896069],
          [45.36126790057149, 37.52485683321957]]], null, false),
    points = ee.FeatureCollection("users/aksoysamett/urmia/42samples"),
    SOCS = ee.Image("users/aksoysamett/soil_organic_carbon_stock");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
var COL = require("users/aksoysamett/urmia_surface_class:RegressionTools/Collection2.js");
var KFold = require("users/aksoysamett/urmia_surface_class:RegressionTools/KFold.js");
var Legend = require("users/aksoysamett/urmia_surface_class:RegressionTools/Legend.js");

var points42 = true;//False olursa 46 noktayı kullanır, True olursa 70 noktanın 42 sini kullanır
var autumn = true;//True ise autumn, false ise spring

//Input Variables
var IV = "Custom";//bands, SI, PCA, TC, Base, VD, ALL, Custom
var customBands = ["SI1","SI4","SI5","CRSI", "wetness"]

var Platform = "S2" //L8, S2
var Regression = "RFR";//RFR, SVR, CART

var gamma =128;
var cost =64;
var treeSize = 100;
var minLeafPopulation = 1;
var exportFolder = (points42 ? 'Points42': 'Points46')+ (autumn ? "Autumn" : "Spring")+IV;

var bufferSize; //0 ise buffer yapmaz, hiç bir değer vermezsek uydu platformuna göre seçilir
var seed = 5;

var bands = ["BLUE", "GREEN", "RED", "NIR", "SWIR1", "SWIR2"]
var SI = ["SI1", "SI2", "SI3", "SI4", "SI5", "SI"]
var PCA = ["pc1", "pc2", "pc3"]
var TC = ['brightness', 'greenness', 'wetness']
var Base = [bands, PCA, TC]
Base = [].concat.apply([], Base)
var VD = ["NDVI", "SAVI", "EVI", "GDVI", "CRSI", "SR", "EVI2", "ENDVI", "EEVI"]
var ALL = [Base, SI, VD]
ALL = [].concat.apply([], ALL)

var exportScale;
var variableInfo;
var classifier;
var processScale;
var bandInfo;

if(Platform == "L8") {
  bufferSize = bufferSize === undefined ? 45 : bufferSize;
  exportScale = 30;
  processScale = 30;
} else {
  bufferSize = bufferSize === undefined ? 25 : bufferSize;
  exportScale = 10;
  processScale = 10;
}

switch(Regression) {
  case "RFR":
    variableInfo = 't'+treeSize;
    classifier = ee.Classifier.smileRandomForest(treeSize).setOutputMode("REGRESSION");
    break;
  case "SVR":
    variableInfo = 'g'+gamma+'_c'+cost;
    classifier = ee.Classifier.libsvm({
      kernelType: 'RBF',
      gamma: gamma,
      cost: cost,
      svmType: 'EPSILON_SVR'
    }).setOutputMode("REGRESSION");
    break;
  case "CART":
    variableInfo = 'mLP'+minLeafPopulation;
    classifier = ee.Classifier.smileCart({minLeafPopulation:minLeafPopulation}).setOutputMode("REGRESSION");
    break;
}

var prefix = Regression+'_'+Platform+'_'+variableInfo;

var sDate = "2016-9-1";
var eDate = "2016-9-30";
var ECPName = 'EC';
var objName = 'OBJECTID';

if(!points42) {
  if(autumn) {
    points = ee.FeatureCollection("users/aksoysamett/urmia/points_6years");
    ECPName = 'autumn2016';
    objName = 'no';
  } else {
    sDate = "2016-6-1";
    eDate = "2016-6-30";
    points = ee.FeatureCollection("users/aksoysamett/urmia/points_6years");
    ECPName = 'spring2016';
    objName = 'no';
  }
}

var img = COL.getImage(Platform, points, sDate, eDate)

Map.addLayer(img, {min: 0, max: 1, bands:['RED','GREEN','BLUE']}, "RGB", false)
SOCS = SOCS.unitScale(0, SOCS.reduceRegion(ee.Reducer.max(), SOCS.geometry(), 250).get("b1")).unmask()

var waterMask = ee.Image(0).mask(COL.getNDWI(img).gt(0.1)).visualize({palette:["2222cc"]})

switch(IV)
{
  case "bands":
    img = img.select(bands);
    break;
  case "SI":
    img = COL.getSI(img).select(SI);
    break;
  case "PCA":
    img = COL.getPCA(img).select(PCA);
    break;
  case "TC":
    img = COL.getTC(img).select(TC);
    break;
  case "Base":
    img = COL.getBase(img).select(Base);
    break;
  case "VD":
    img = COL.getVD(img).select(VD);
    break;
  case "ALL":
    img = COL.getALL(img).select(ALL);
    break;
  case "Custom":
    img = COL.getALL(img).select(ALL);
    break;
}

var justPoints=points;
if(bufferSize !== 0)
  points = points.map(function(f){return f.buffer(bufferSize)})
var minMax = img.reduceRegion({
  reducer:ee.Reducer.minMax().unweighted(),
  geometry:img.select(0).geometry(),
  scale:processScale,
  maxPixels:1e10
});
//print(minMax)

img = ee.Image(img.bandNames().iterate(function(bandName, image){
  var minStr = ee.String(bandName).cat("_min");
  var maxStr = ee.String(bandName).cat("_max");
  var scaled = img.select([bandName]).unitScale(minMax.get(minStr), minMax.get(maxStr)).double();
  return ee.Image(image).addBands(scaled)
}, img.select()))

if(IV == "Custom" && customBands.indexOf("CRSI") != -1 || IV == "ALL" || IV == "VD")
  img = img.select(img.bandNames().filter(ee.Filter.neq("item", "CRSI"))).addBands(img.select("CRSI").sqrt())

if(IV == "Custom" && customBands.indexOf("SOCS") != -1 || IV == "ALL" && ALL.indexOf("SOCS") != -1)
  img = img.addBands(SOCS.select([0],["SOCS"]))

if(IV == "Custom"){
  img = img.select(customBands);
  bandInfo = customBands.join("-");
}else
  bandInfo = IV;
print(img)
print(exportFolder+" "+prefix+'_'+exportScale+'m_b'+bufferSize+"_"+bandInfo)
//print(points)
Map.addLayer(points, {}, "point", false)
Map.centerObject(points, 13)

var samples = KFold.PrepareSamples(img, points, processScale, [ECPName], seed);
var k = 5;

var kfoldClassified = KFold.doKFold(classifier, k, samples, img, ECPName);

print("Train R²", kfoldClassified.aggregate_array("training_r2"))
print("Validation R²", kfoldClassified.aggregate_array("validation_r2"))
print("Train R² mean", kfoldClassified.aggregate_mean("training_r2"))
print("Validation R² mean", kfoldClassified.aggregate_mean("validation_r2"))
print("Train RMSE", kfoldClassified.aggregate_array("training_rmse"))
print("Validation RMSE", kfoldClassified.aggregate_array("validation_rmse"))
print("Train RMSE mean of K-Fold", kfoldClassified.aggregate_mean("training_rmse"))
print("Validation RMSE mean of K-Fold", kfoldClassified.aggregate_mean("validation_rmse"))
print("explain", kfoldClassified.aggregate_array("explain"))

var names = ["Non-Saline","Slightly Saline", "Moderately  Saline", "Highly Saline", "Extremely Saline"]
var palette = ["00FF00","AAFF00","FFFF00","FF8900","FF1800", "991800"];
var paletteReverse = ["00FF00","AAFF00","FFFF00","FF8900","FF1800"].reverse()
var imageVisParam = {"min":1,"max":6,"palette":palette}

var kfoldClassifiedMode = kfoldClassified.mode();
var kfoldClassifiedModeW = ee.ImageCollection([kfoldClassifiedMode.visualize(imageVisParam), waterMask, justPoints.style({fillColor:"00000000"})]).mosaic();
Map.addLayer(kfoldClassifiedModeW, {}, "EC Mode", true)

var kfoldClassifiedChange = kfoldClassified.reduce(ee.Reducer.countDistinct()).visualize({min: 1, max: k, palette:palette});
kfoldClassifiedChange = ee.ImageCollection([kfoldClassifiedChange, waterMask, justPoints.style({fillColor:"00000000"})]).mosaic();
Map.addLayer(kfoldClassifiedChange, {}, 'EC Change', false);
var kfoldClassifiedMasked = kfoldClassified.map(function(i){
  return i.eq(kfoldClassifiedMode)
})
var kfoldConfidence = kfoldClassifiedMasked.reduce(ee.Reducer.sum()).visualize({min: 1, max: k, palette:paletteReverse});
kfoldConfidence = ee.ImageCollection([kfoldConfidence, waterMask, justPoints.style({fillColor:"00000000"})]).mosaic();
Map.addLayer(kfoldConfidence, {}, 'EC Confidence', false);


var kfoldstd = kfoldClassified.reduce(ee.Reducer.stdDev());
kfoldstd = kfoldstd.visualize({min: 0, max: 1, palette:palette});
kfoldstd = ee.ImageCollection([kfoldstd, waterMask, justPoints.style({fillColor:"00000000"})]).mosaic();
Map.addLayer(kfoldstd, {}, 'EC stdDev', false);

ExportImage(kfoldClassifiedModeW, '_mode');

//ExportImage(kfoldClassifiedChange, '_chng');
//ExportImage(kfoldConfidence, '_conf');
//ExportImage(kfoldstd, '_std');

function ExportImage(img, postfix)
{
  Export.image.toDrive({
    image: img.reproject('EPSG:3857', null, exportScale),
    description: prefix+'_'+exportScale+'m_b'+bufferSize+"_"+bandInfo+postfix,
    scale: exportScale,
    region: exportGeometry,
    folder: exportFolder,
    maxPixels: 1e13
  });
}
var legend = Legend.CreateLegend('EC Classification After Regression', ["2222cc"].concat(palette), ["Water"].concat(names));
Map.add(legend);