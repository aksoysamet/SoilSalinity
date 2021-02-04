var coefficientsL8 = ee.Array([ //https://yceo.yale.edu/tasseled-cap-transform-landsat-8-oli
  [0.3029, 0.2786, 0.4733, 0.5599, 0.508, 0.1872],
  [-0.2941, -0.243, -0.5424, 0.7276, 0.0713, -0.1608],
  [0.1511, 0.1973, 0.3283, 0.3407, -0.7117, -0.4559],
  [-0.8239, 0.0849, 0.4396, -0.0580, 0.2013, -0.2773],
  [-0.3294, 0.0557, 0.1056, 0.1855, -0.4349, 0.8085],
  [0.1079, -0.9023, 0.4119, 0.0575, -0.0259, 0.0252]
]);

var coefficientsS2 = ee.Array([ //10.1109/JSTARS.2019.2938388
  [0.3510, 0.3813, 0.3437, 0.7196, 0.2396, 0.1949],
  [-0.3599, -0.3533, -0.4734, 0.6633, 0.0087, -0.2856],
  [0.2578, 0.2305, 0.0883, 0.1071, -0.7611, -0.5308],
  [0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000],
  [0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000],
  [0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000]
]);

function ImageToArray(img)
{
  var arrayImage1D = img.toArray();
  var arrayImage2D = arrayImage1D.toArray(1);
  return arrayImage2D;
}

function TasseledCapL8(img){
  var arrayImage2D = ImageToArray(img);
  return ee.Image(coefficientsL8)
    .matrixMultiply(arrayImage2D)
    // Get rid of the extra dimensions.
    .arrayProject([0])
    .arrayFlatten(
      [['brightness', 'greenness', 'wetness', 'fourth', 'fifth', 'sixth']]);
}
exports.TasseledCapL8 = TasseledCapL8
function TasseledCapS2(img){
  var arrayImage2D = ImageToArray(img);
  return ee.Image(coefficientsS2)
    .matrixMultiply(arrayImage2D)
    // Get rid of the extra dimensions.
    .arrayProject([0])
    .arrayFlatten(
      [['brightness', 'greenness', 'wetness', 'fourth', 'fifth', 'sixth']]);
}
exports.TasseledCapS2 = TasseledCapS2