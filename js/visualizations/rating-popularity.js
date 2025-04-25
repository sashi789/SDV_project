// Rating vs Popularity Correlation Visualization
document.addEventListener('DOMContentLoaded', function() {
    // Load the data
    d3.csv("../data/movies_data.csv").then(function(data) {
        createRatingPopularityChart(data);
    }).catch(function(error) {
        console.error("Error loading the data: ", error);
    });

    function createRatingPopularityChart(data) {
        // Set up dimensions and margins
        const margin = {top: 40, right: 30, bottom: 60, left: 70};
        const width = document.getElementById('rating-popularity-chart').clientWidth - margin.left - margin.right;
        const height = document.getElementById('rating-popularity-chart').clientHeight - margin.top - margin.bottom;

        // Clear any existing SVG
        d3.select("#rating-popularity-chart").html("");

        // Create SVG element
        const svg = d3.select("#rating-popularity-chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Process data - extract unique movies with their ratings and popularity
        const movieMap = new Map();
        
        data.forEach(d => {
            const movieId = d.movieId;
            const rating = parseFloat(d.vote_average);
            const popularity = parseFloat(d.popularity);
            
            if (!isNaN(rating) && !isNaN(popularity)) {
                movieMap.set(movieId, {
                    title: d.title,
                    rating: rating,
                    popularity: popularity,
                    genre: d.genres_flattened.split(' ')[0] // Just take the first genre for coloring
                });
            }
        });
        
        const movieData = Array.from(movieMap.values());

        // Set up scales
        const x = d3.scaleLinear()
            .domain([0, d3.max(movieData, d => d.rating)])
            .nice()
            .range([0, width]);

        const y = d3.scaleLog()
            .domain([0.1, d3.max(movieData, d => d.popularity)])
            .nice()
            .range([height, 0]);

        // Create color scale for genres
        const genres = Array.from(new Set(movieData.map(d => d.genre)));
        const colorScale = d3.scaleOrdinal()
            .domain(genres)
            .range(d3.schemeCategory10);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x));

        // Add X axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .text("Average Rating");

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y).ticks(5, ".1f"));

        // Add Y axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -height / 2)
            .text("Popularity (log scale)");

        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Correlation Between Rating and Popularity");

        // Create a tooltip
        const tooltip = d3.select("#rating-popularity-chart")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "white")
            .style("border", "1px solid #ddd")
            .style("border-radius", "3px")
            .style("padding", "10px")
            .style("pointer-events", "none");

        // Add dots
        svg.selectAll(".dot")
            .data(movieData)
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.rating))
            .attr("cy", d => y(d.popularity))
            .attr("r", 5)
            .attr("fill", d => colorScale(d.genre))
            .attr("opacity", 0.7)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("r", 8)
                    .attr("opacity", 1);
                
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                
                tooltip.html(`<strong>${d.title}</strong><br/>
                            Rating: ${d.rating}<br/>
                            Popularity: ${d.popularity.toFixed(2)}<br/>
                            Genre: ${d.genre}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("r", 5)
                    .attr("opacity", 0.7);
                
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Add regression line
        const xValues = movieData.map(d => d.rating);
        const yValues = movieData.map(d => Math.log10(d.popularity)); // Log transform for calculation
        
        const regression = linearRegression(xValues, yValues);
        
        const x1 = d3.min(xValues);
        const y1 = regression.slope * x1 + regression.intercept;
        const x2 = d3.max(xValues);
        const y2 = regression.slope * x2 + regression.intercept;
        
        svg.append("line")
            .attr("x1", x(x1))
            .attr("y1", y(Math.pow(10, y1))) // Convert back from log
            .attr("x2", x(x2))
            .attr("y2", y(Math.pow(10, y2))) // Convert back from log
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");

        // Add correlation coefficient
        const correlation = pearsonCorrelation(xValues, yValues);
        
        svg.append("text")
            .attr("x", width - 150)
            .attr("y", 30)
            .attr("text-anchor", "start")
            .text(`Correlation: ${correlation.toFixed(2)}`)
            .attr("fill", "red");

        // Add legend
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 120}, 50)`);

        genres.forEach((genre, i) => {
            const legendRow = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
            
            legendRow.append("rect")
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", colorScale(genre));
            
            legendRow.append("text")
                .attr("x", 15)
                .attr("y", 10)
                .attr("text-anchor", "start")
                .style("text-transform", "capitalize")
                .text(genre);
        });
    }

    // Add filter functionality
    d3.select("#genre-filter").on("change", function() {
        const selectedGenre = this.value;
        d3.csv("../data/movies_data.csv").then(function(data) {
            let filteredData;
            
            if (selectedGenre === "all") {
                filteredData = data;
            } else {
                filteredData = data.filter(d => {
                    const genres = d.genres_flattened.split(' ');
                    return genres.includes(selectedGenre);
                });
            }
            
            createRatingPopularityChart(filteredData);
        });
    });

    // Helper functions for regression and correlation
    function linearRegression(x, y) {
        const n = x.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumXX += x[i] * x[i];
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        return { slope, intercept };
    }

    function pearsonCorrelation(x, y) {
        const n = x.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;
        let sumYY = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumXX += x[i] * x[i];
            sumYY += y[i] * y[i];
        }
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        
        return numerator / denominator;
    }
});