function CreateLegend(legendName, palette, names)
{
  var legend = ui.Panel({
    style: {
      position: 'bottom-left',
      padding: '8px 15px'
    }
  });
  
  // Create legend title
  var legendTitle = ui.Label({
    value: legendName,
    style: {
      fontWeight: 'bold',
      fontSize: '18px',
      margin: '0 0 4px 0',
      padding: '0'
      }
  });
  
  legend.add(legendTitle);
  
  var makeRow = function(color, name) {
    // Create the label that is actually the colored box.
    var colorBox = ui.Label({
      style: {
        backgroundColor: '#' + color,
        // Use padding to give the box height and width.
        padding: '8px',
        margin: '0 0 4px 0'
      }
    });

    // Create the label filled with the description text.
    var description = ui.Label({
      value: name,
      style: {margin: '0 0 4px 6px'}
    });

    // return the panel
    return ui.Panel({
      widgets: [colorBox, description],
      layout: ui.Panel.Layout.Flow('horizontal')
    });
  };
  // Add color and and names
  for (var i = 0; i < palette.length; i++) {
    legend.add(makeRow(palette[i], names[i]));
  }
  return legend;
}
exports.CreateLegend = CreateLegend;