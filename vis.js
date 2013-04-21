
// constants
var map_margin = {top: 30, right: 20, bottom: 20, left: 30},
    map_width = 1100 - map_margin.left - map_margin.right,
    map_height = 425 - map_margin.top - map_margin.bottom,
    control_margin = {top: 20, right: 20, bottom: 20, left: 30},
    control_width = map_width,
    control_height = 100;

var map_projection = d3.geo.mercator()
    .center([0, -20])
    .scale(190)
    .rotate([0,0]);

var colorScale = d3.scale.linear()
    .domain([-1,     0,      0.05,    0.1,     0.15,    0.3,    10])
    .range(['white', 'red', 'orange', 'yellow', 'green', 'blue', 'blue']);


// setup map and control elements
var map = d3.select("body").append("svg")
    .classed("map", true)
    .attr("width", map_width)
    .attr("height", map_height)
    .attr("transform", "translate(" + map_margin.left + "," + map_margin.top + ")")
    .append("g");

var control = d3.select("body").append("svg")
    .attr("width", control_width)
    .attr("height", control_height)
    .append("g");

// setup world background
d3.json("world-110m2.json", function(error, topology) {
    var path = d3.geo.path()
        .projection(map_projection);
	map.selectAll("path")
      .data(topojson.object(topology, topology.objects.countries)
          .geometries)
    .enter()
      .append("path")
      .attr("d", path)
});

var precip_data = null;
var map_cells;

// load and process data
d3.json("precip.json", function(raw_entries){

    precip_data = raw_entries.map(function(entry){
        var obj = {};
        obj.date = new Date(entry[0], entry[1], entry[2], 0, 0, 0, 0);
        obj.precip_array = entry[3];;
        var i, j, acc=0, count=0, p=obj.precip_array;
        for (i=0; i<p.length; i++) {
            var row = p[i];
            for (j=0; j<row.length; j++) {
                if (row[j] >= 0) {
                    acc += row[j];
                    count += 1;
                }
            }
        }
        obj.mean = acc / count;
        return obj;
    });

    precip_data.ncol = precip_data[0].precip_array.length;
    precip_data.nrow = precip_data[0].precip_array[0].length;

    setup_map();
    setup_control();
});

function calculate_average_data(lower_date, upper_date) {
    var nc = precip_data.ncol;
    var nr = precip_data.nrow;

    var i,j, acc=[], count=[];
    for (i=0; i<nc; i++) {
        acc[i] = [];
        count[i] = [];
        for (j=0; j<nr; j++) {
            acc[i][j] = 0;
            count[i][j] = 0;
        }
    }
     
    // sum data from all entries in date range
    var n_included = 0;
    precip_data.forEach(function(entry){
        if (entry.date.getTime() < lower_date.getTime() ||
            entry.date.getTime() > upper_date.getTime()) {
            return;
        }
        n_included ++;

        var i, j, p=entry.precip_array;
        for (i=0; i<p.length; i++) {
            var row = p[i];
            for (j=0; j<row.length; j++) {
                if (row[j] >= 0) {
                    acc[i][j] += row[j];
                    count[i][j] += 1;
                }
            }
        }
    });

    // deal with small date range that does not include
    // any observations

    if (!n_included) {
        var min_delta = 1e20;
        var min_data = null;
        var t = 0.5 * (lower_date.getTime() + upper_date.getTime());
        precip_data.forEach(function(entry){
            var delta = Math.abs(t - entry.date.getTime());
            if (delta < min_delta) {
                min_delta = delta;
                min_data = entry.precip_data;
            }
        });
        return min_data;
    }

    var new_data = [];
    for (i=0; i<nc; i++) {
        new_data[i] = [];
        for (j=0; j<nr; j++) {
            new_data[i][j] = count[i][j] ?
                      acc[i][j] / count[i][j] :
                      -1;
        }
    }
    return new_data;
}

function setup_map()
{
    var data = calculate_average_data(precip_data[0].date,
                                      precip_data[precip_data.length - 1].date);

    var row = map.selectAll(".row")
        .data(data)
        .enter().append("svg:g")
        .attr("class", "row");

    var lon_scale = d3.scale.linear()
        .range([-180, 180])
        .domain([0, precip_data.nrow]);

    var lat_scale = d3.scale.linear()
        .range([-40, 40])
        .domain([0, precip_data.ncol]);

    function proj(x, y)
    {
        return map_projection([lon_scale(x), lat_scale(y)]);
    }

    map_cells = row.selectAll(".cell")
        .data(function (d,i) { return d.map(function(a) { return {value: a, row: i}; } ) })
        .enter().append("svg:polygon")
        .attr("class", "cell")
        .attr("points", function(d, i) {
            var ya = d.row;
            var xa = i;
            var yb = d.row + 1;
            var xb = i + 1;
            var px = [proj(xa, ya), proj(xb, ya),
                      proj(xb, yb), proj(xa, yb)];
            return px;
        })
        .style("opacity", function(d) { return d.value < 0 ? 0 : 0.5; })
        .style("fill", function(d) { return colorScale(d.value); });
}

function setup_control()
{
    var x_t = d3.time.scale().range([0, control_width]);
    var y_t = d3.scale.linear().range([control_height, 0]);
    x_t.domain(d3.extent(precip_data.map(function(d) { return d.date; })));
    y_t.domain([0.08,
                d3.max(precip_data.map(function(d) { return d.mean; }))]);

    var brush = d3.svg.brush()
        .x(x_t)
        .on("brush", brushed_handler);
    var xAxis = d3.svg.axis().scale(x_t)

    var area = d3.svg.area()
        .interpolate("monotone")
        .x(function(d) { return x_t(d.date); })
        .y0(50)
        .y1(function(d) { return y_t(d.mean); });

    control.append("path")
        .datum(precip_data)
        .attr("d", area);

    control.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + 50 + ")")
      .call(xAxis);

    control.append("g")
        .attr("class", "x brush")
        .call(brush)
        .selectAll("rect")
        .attr("y", -6)
        .attr("height", 50);

    brush.extent([precip_data[35].date, 
                  precip_data[40].date]);
    control.select(".brush").call(brush);

    var pending_timeout = null;
    function brushed_handler() {
        if (pending_timeout !== null) {
            clearTimeout(pending_timeout);
        }
        pending_timeout = setTimeout(handle_brush, 50);
    }

    function handle_brush() {
        pending_timeout = null;
        console.log("brushed");
        var domain = brush.empty() ? x_t.domain() : brush.extent();
        var new_data = calculate_average_data(domain[0], domain[1]);
        map_cells.style("fill", function(d, i) {
            return colorScale(new_data[d.row][i]);
        });
    }
}
