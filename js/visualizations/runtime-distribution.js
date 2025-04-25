// Movie Runtime Distribution Visualization
document.addEventListener('DOMContentLoaded', function() {
    // Load the data
    d3.csv("../data/movies_data.csv").then(function(data) {
        createRuntimeHistogram(data);
    }).catch(function(error) {
        console.error("Error loading the data: ", error);
    });

    function createRuntimeHistogram(data) {
        // Set up dimensions and margins
        const margin = {top: 40, right: 30, bottom: 60, left: 60};
        const width = document.getElementById('runtime-histogram').clientWidth - margin.left - margin.right;
        const height = document.getElementById('runtime-histogram').clientHeight - margin.top - margin.bottom;

        // Clear any existing SVG
        d3.select("#runtime-histogram").html("");

        // Create SVG element
        const svg = d3.select("#runtime-histogram")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Process data - extract runtimes
        const runtimes = data.map(d => parseInt(d.runtime)).filter(d => !isNaN(d));
        
        // Create histogram bins
        const histogram = d3.histogram()
            .value(d => d)
            .domain([0, d3.max(runtimes)])
            .thresholds(d3.range(0, d3.max(runtimes) + 10, 10));
            
        const bins = histogram(runtimes);

        // Set up scales
        const x = d3.scaleLinear()
            .domain([0, d3.max(runtimes)])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .nice()
            .range([height, 0]);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d => `${d} min`));

        // Add X axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .text("Runtime (minutes)");

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y));

        // Add Y axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -height / 2)
            .text("Number of Movies");

        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Distribution of Movie Runtimes");

        // Add bars
        svg.selectAll(".bar")
            .data(bins)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.x0))
            .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
            .attr("y", d => y(d.length))
            .attr("height", d => height - y(d.length))
            .attr("fill", "#69b3a2")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "#3a8c7a");
                
                // Add tooltip
                svg.append("text")
                    .attr("class", "tooltip")
                    .attr("x", x(d.x0) + (x(d.x1) - x(d.x0)) / 2)
                    .attr("y", y(d.length) - 10)
                    .attr("text-anchor", "middle")
                    .text(`${d.x0}-${d.x1} min: ${d.length} movies`);
            })
            .on("mouseout", function() {
                d3.select(this).attr("fill", "#69b3a2");
                svg.selectAll(".tooltip").remove();
            });

        // Add mean line
        const meanRuntime = d3.mean(runtimes);
        svg.append("line")
            .attr("x1", x(meanRuntime))
            .attr("x2", x(meanRuntime))
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");

        svg.append("text")
            .attr("x", x(meanRuntime) + 5)
            .attr("y", 20)
            .attr("text-anchor", "start")
            .text(`Mean: ${meanRuntime.toFixed(0)} min`)
            .attr("fill", "red");
    }

    // Add filter functionality
    d3.select("#decade-filter").on("change", function() {
        const selectedDecade = this.value;
        d3.csv("../data/movies_data.csv").then(function(data) {
            let filteredData;
            
            if (selectedDecade === "all") {
                filteredData = data;
            } else {
                const [startYear, endYear] = selectedDecade.split("-").map(Number);
                filteredData = data.filter(d => {
                    const year = new Date(d.release_date).getFullYear();
                    return year >= startYear && year <= endYear;
                });
            }
            
            createRuntimeHistogram(filteredData);
        });
    });
});