function PrepareSamples(img, points, scale, properties, seed)
{
  seed = seed === undefined ? 1 : seed;
  var samples = img.sampleRegions({
    collection: points,
    properties: properties,
    scale: scale,
    geometries:true
  });
  return ShuffleSamples(samples, seed);
}
function ShuffleSamples(samples, seed){
  return ee.FeatureCollection(ee.List(samples.randomColumn("random", seed).sort("random").iterate(function(f,l){
    l = ee.List(l);
    return l.add(f.set("FOLD", ee.Number(l.size()).divide(samples.size())));
  }, ee.List([]))));
}
exports.ShuffleSamples = ShuffleSamples
exports.PrepareSamples = PrepareSamples
function doKFold(classifier, k, samples, img, ECPName){
  return ee.ImageCollection(ee.List.sequence(0, k-1).map(function(r){
    var startRange = ee.Number(r).divide(k);
    var endRange =startRange.add(ee.Number(1).divide(k));
    var train = samples.filter(ee.Filter.or(ee.Filter.lt("FOLD", startRange), ee.Filter.gte("FOLD", endRange)));
    var validation = samples.filter(ee.Filter.and(ee.Filter.gte("FOLD", startRange), ee.Filter.lt("FOLD", endRange)));
    var trained = classifier.train(train, ECPName, img.bandNames());
    var classified = setPalletes(img.classify(trained));
    var trainClassified = train.classify(trained)
    var valClassified = validation.classify(trained)
    var training_r2 = ee.Number(trainClassified.reduceColumns(ee.Reducer.pearsonsCorrelation(), [ECPName,"classification"]).get("correlation")).pow(2);
    var validation_r2 = ee.Number(valClassified.reduceColumns(ee.Reducer.pearsonsCorrelation(), [ECPName,"classification"]).get("correlation")).pow(2);
    var training_res = trainClassified.map(function(f){
      return f.set("res", ee.Number(f.get(ECPName)).subtract(f.get("classification")).pow(2));
    })
    var training_rmse = ee.Number(training_res.reduceColumns(ee.Reducer.sum(), ["res"]).get("sum")).divide(trainClassified.size()).sqrt()
    var validation_res = valClassified.map(function(f){
      return f.set("res", ee.Number(f.get(ECPName)).subtract(f.get("classification")).pow(2));
    })
    var validation_rmse = ee.Number(validation_res.reduceColumns(ee.Reducer.sum(), ["res"]).get("sum")).divide(valClassified.size()).sqrt()
    return classified.set({training_res:training_res, validation_res:validation_res, training_r2:training_r2, validation_r2:validation_r2, training_rmse:training_rmse, validation_rmse:validation_rmse,explain:trained.explain()});
  }));
}
exports.doKFold = doKFold
function setPalletes(image){
  return ee.Image(0)
    .where(image.lte(2), 1)
    .where(image.gt(2), 2)
    .where(image.gt(4), 3)
    .where(image.gt(8), 4)
    .where(image.gt(16), 5)
    .updateMask(image.mask())
}
exports.setPalletes = setPalletes