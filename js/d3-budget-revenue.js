// D3.js Budget vs Revenue Visualization
document.addEventListener('DOMContentLoaded', function() {
    // Set up dimensions and margins
    const margin = {top: 60, right: 120, bottom: 70, left: 90};
    const width = 960 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3.select("#d3-budget-revenue")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Movie Budget vs Revenue (D3.js)");

    // Load and process data
    d3.csv("../data/movies_data.csv").then(function(data) {
        // Process data
        data.forEach(d => {
            d.budget = +d.budget;
            d.revenue = +d.revenue;
            d.vote_average = +d.vote_average;
        });

        // Get unique movies (since dataset has duplicate movie entries)
        const uniqueMovies = Array.from(
            d3.group(data, d => d.title),
            ([title, movies]) => {
                const movie = movies[0]; // Take first instance of each movie
                return {
                    title: title,
                    budget: movie.budget,
                    revenue: movie.revenue,
                    vote_average: movie.vote_average,
                    genres: movie.genres_flattened,
                    roi: movie.revenue / movie.budget
                };
            }
        ).filter(d => d.budget > 0 && d.revenue > 0); // Filter out movies with zero budget/revenue

        // Create scales
        const xScale = d3.scaleLog()
            .domain([d3.min(uniqueMovies, d => d.budget) * 0.8, d3.max(uniqueMovies, d => d.budget) * 1.2])
            .range([0, width]);

        const yScale = d3.scaleLog()
            .domain([d3.min(uniqueMovies, d => d.revenue) * 0.8, d3.max(uniqueMovies, d => d.revenue) * 1.2])
            .range([height, 0]);

        // Color scale based on ROI
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, d3.max(uniqueMovies, d => Math.min(d.roi, 10))]);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale).tickFormat(d => `$${d3.format(".1s")(d)}`))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)");

        // Add X axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .text("Budget (USD)");

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(yScale).tickFormat(d => `$${d3.format(".1s")(d)}`));

        // Add Y axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 20)
            .attr("x", -height / 2)
            .text("Revenue (USD)");

        // Add break-even line
        const minVal = Math.min(xScale.domain()[0], yScale.domain()[0]);
        const maxVal = Math.max(xScale.domain()[1], yScale.domain()[1]);
        
        svg.append("line")
            .attr("x1", xScale(minVal))
            .attr("y1", yScale(minVal))
            .attr("x2", xScale(maxVal))
            .attr("y2", yScale(maxVal))
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "5,5")
            .attr("opacity", 0.7);

        // Add tooltip
        const tooltip = d3.select("#d3-budget-revenue")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("border-radius", "5px")
            .style("padding", "10px")
            .style("font-size", "12px");

        // Add scatter plot points
        svg.selectAll(".dot")
            .data(uniqueMovies)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => xScale(d.budget))
            .attr("cy", d => yScale(d.revenue))
            .attr("r", 6)
            .attr("fill", d => colorScale(Math.min(d.roi, 10)))
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .attr("opacity", 0.8)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 10)
                    .attr("opacity", 1);
                
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                
                tooltip.html(`<strong>${d.title}</strong><br>` +
                        `Budget: $${d.budget.toLocaleString()}<br>` +
                        `Revenue: $${d.revenue.toLocaleString()}<br>` +
                        `ROI: ${d.roi.toFixed(2)}<br>` +
                        `Rating: ${d.vote_average}<br>` +
                        `Genres: ${d.genres}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 6)
                    .attr("opacity", 0.8);
                
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Add legend for ROI
        const legendWidth = 20;
        const legendHeight = 200;
        
        const legend = svg.append("g")
            .attr("transform", `translate(${width + 30}, ${height/2 - legendHeight/2})`);
        
        // Create gradient for legend
        const defs = svg.append("defs");
        
        const gradient = defs.append("linearGradient")
            .attr("id", "roi-gradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");
        
        // Add color stops
        const numStops = 10;
        for (let i = 0; i <= numStops; i++) {
            const offset = i / numStops;
            gradient.append("stop")
                .attr("offset", offset)
                .attr("stop-color", colorScale(offset * 10));
        }
        
        // Add rectangle with gradient
        legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#roi-gradient)");
        
        // Add legend axis
        const legendScale = d3.scaleLinear()
            .domain([0, 10])
            .range([legendHeight, 0]);
        
        legend.append("g")
            .attr("transform", `translate(${legendWidth}, 0)`)
            .call(d3.axisRight(legendScale).ticks(5));
        
        // Add legend title
        legend.append("text")
            .attr("transform", `translate(${legendWidth/2}, -10)`)
            .attr("text-anchor", "middle")
            .text("ROI");

        // Add toggle for log/linear scale
        const scaleToggle = d3.select("#scale-toggle");
        if (scaleToggle.node()) {
            scaleToggle.on("change", function() {
                const useLogScale = this.checked;
                
                // Update X scale
                const xScaleNew = useLogScale ? 
                    d3.scaleLog()
                        .domain([d3.min(uniqueMovies, d => d.budget) * 0.8, d3.max(uniqueMovies, d => d.budget) * 1.2])
                        .range([0, width]) :
                    d3.scaleLinear()
                        .domain([0, d3.max(uniqueMovies, d => d.budget) * 1.1])
                        .range([0, width]);
                
                // Update Y scale
                const yScaleNew = useLogScale ? 
                    d3.scaleLog()
                        .domain([d3.min(uniqueMovies, d => d.revenue) * 0.8, d3.max(uniqueMovies, d => d.revenue) * 1.2])
                        .range([height, 0]) :
                    d3.scaleLinear()
                        .domain([0, d3.max(uniqueMovies, d => d.revenue) * 1.1])
                        .range([height, 0]);
                
                // Update axes
                svg.select(".x-axis")
                    .transition()
                    .duration(1000)
                    .call(d3.axisBottom(xScaleNew).tickFormat(d => `$${d3.format(".1s")(d)}`));
                
                svg.select(".y-axis")
                    .transition()
                    .duration(1000)
                    .call(d3.axisLeft(yScaleNew).tickFormat(d => `$${d3.format(".1s")(d)}`));
                
                // Update points
                svg.selectAll(".dot")
                    .transition()
                    .duration(1000)
                    .attr("cx", d => xScaleNew(d.budget))
                    .attr("cy", d => yScaleNew(d.revenue));
                
                // Update break-even line
                const minValNew = Math.min(xScaleNew.domain()[0], yScaleNew.domain()[0]);
                const maxValNew = Math.max(xScaleNew.domain()[1], yScaleNew.domain()[1]);
                
                svg.select(".break-even-line")
                    .transition()
                    .duration(1000)
                    .attr("x1", xScaleNew(minValNew))
                    .attr("y1", yScaleNew(minValNew))
                    .attr("x2", xScaleNew(maxValNew))
                    .attr("y2", yScaleNew(maxValNew));
            });
        }
    }).catch(function(error) {
        console.error("Error loading the data:", error);
    });
});