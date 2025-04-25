// Movie Data Visualizations using D3.js, Plotly, and Vega-Lite (Altair)
document.addEventListener('DOMContentLoaded', function() {
    // Load the CSV data
    d3.csv("../data/movies_data.csv").then(function(data) {
        // Process the data
        data.forEach(d => {
            d.budget = +d.budget;
            d.revenue = +d.revenue;
            d.vote_average = +d.vote_average;
            d.vote_count = +d.vote_count;
            d.rating = +d.rating;
            d.popularity = +d.popularity;
            d.runtime = +d.runtime;
            // Convert timestamp to date if needed
            d.release_date = new Date(d.release_date);
        });

        // Initialize visualizations if their containers exist
        if (document.getElementById('d3-rating-distribution')) {
            createRatingDistribution(data);
        }
        
        if (document.getElementById('plotly-budget-revenue')) {
            createBudgetRevenueScatter(data);
        }
        
        if (document.getElementById('vega-genre-heatmap')) {
            createGenreHeatmap(data);
        }
        
        if (document.getElementById('d3-popularity-timeline')) {
            createPopularityTimeline(data);
        }
        
        if (document.getElementById('plotly-runtime-rating')) {
            createRuntimeRatingChart(data);
        }
    }).catch(function(error) {
        console.error("Error loading the data:", error);
    });

    // D3.js Visualization: Rating Distribution
    function createRatingDistribution(data) {
        // Set up dimensions and margins
        const margin = {top: 40, right: 30, bottom: 60, left: 60};
        const width = document.getElementById('d3-rating-distribution').clientWidth - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        // Clear any existing SVG
        d3.select("#d3-rating-distribution").html("");

        // Create SVG element
        const svg = d3.select("#d3-rating-distribution")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Process data - count ratings
        const ratingCounts = {};
        data.forEach(d => {
            const rating = parseFloat(d.rating);
            if (!isNaN(rating)) {
                ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
            }
        });

        // Convert to array for D3
        const ratingData = Object.entries(ratingCounts).map(([rating, count]) => ({
            rating: parseFloat(rating),
            count: count
        })).sort((a, b) => a.rating - b.rating);

        // Set up scales
        const x = d3.scaleBand()
            .domain(ratingData.map(d => d.rating))
            .range([0, width])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(ratingData, d => d.count)])
            .nice()
            .range([height, 0]);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("text-anchor", "middle");

        // Add X axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .text("User Rating");

        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y));

        // Add Y axis label
        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -height / 2)
            .text("Number of Ratings");

        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Distribution of User Ratings");

        // Create color scale
        const colorScale = d3.scaleLinear()
            .domain([d3.min(ratingData, d => d.rating), d3.max(ratingData, d => d.rating)])
            .range(["#ff9999", "#66cc66"]);

        // Add bars
        svg.selectAll(".bar")
            .data(ratingData)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.rating))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d.count))
            .attr("height", d => height - y(d.count))
            .attr("fill", d => colorScale(d.rating))
            .on("mouseover", function(event, d) {
                d3.select(this).attr("opacity", 0.8);
                
                // Add tooltip
                svg.append("text")
                    .attr("class", "tooltip")
                    .attr("x", x(d.rating) + x.bandwidth() / 2)
                    .attr("y", y(d.count) - 10)
                    .attr("text-anchor", "middle")
                    .text(`Count: ${d.count}`);
            })
            .on("mouseout", function() {
                d3.select(this).attr("opacity", 1);
                svg.selectAll(".tooltip").remove();
            });

        // Add filter functionality
        d3.select("#rating-filter").on("change", function() {
            const selectedRating = this.value;
            let filteredData;
            
            if (selectedRating === "all") {
                filteredData = ratingData;
            } else {
                filteredData = ratingData.filter(d => d.rating === parseFloat(selectedRating));
            }
            
            // Update y scale
            y.domain([0, d3.max(filteredData, d => d.count)]).nice();
            svg.select(".y-axis").transition().duration(500).call(d3.axisLeft(y));
            
            // Update bars
            const bars = svg.selectAll(".bar").data(filteredData, d => d.rating);
            
            bars.exit().remove();
            
            bars.enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", d => x(d.rating))
                .attr("width", x.bandwidth())
                .attr("y", height)
                .attr("height", 0)
                .attr("fill", d => colorScale(d.rating))
                .merge(bars)
                .transition()
                .duration(500)
                .attr("x", d => x(d.rating))
                .attr("width", x.bandwidth())
                .attr("y", d => y(d.count))
                .attr("height", d => height - y(d.count));
        });
    }

    // Plotly Visualization: Budget vs Revenue Scatter Plot
    function createBudgetRevenueScatter(data) {
        // Process data for unique movies
        const uniqueMovies = Array.from(new Set(data.map(d => d.title))).map(title => {
            const movie = data.find(d => d.title === title);
            return {
                budget: movie.budget,
                revenue: movie.revenue,
                title: movie.title,
                roi: movie.revenue / movie.budget,
                vote_average: movie.vote_average
            };
        });

        // Create scatter plot
        const trace = {
            x: uniqueMovies.map(d => d.budget),
            y: uniqueMovies.map(d => d.revenue),
            mode: 'markers',
            type: 'scatter',
            text: uniqueMovies.map(d => `${d.title}<br>Budget: $${d.budget.toLocaleString()}<br>Revenue: $${d.revenue.toLocaleString()}<br>ROI: ${d.roi.toFixed(2)}<br>Rating: ${d.vote_average}`),
            marker: {
                size: 15,
                color: uniqueMovies.map(d => d.vote_average),
                colorscale: 'Viridis',
                showscale: true,
                colorbar: {
                    title: 'Average Rating'
                }
            },
            hoverinfo: 'text'
        };

        const layout = {
            title: 'Movie Budget vs Revenue',
            xaxis: {
                title: 'Budget ($)',
                type: 'linear'
            },
            yaxis: {
                title: 'Revenue ($)',
                type: 'linear'
            },
            hovermode: 'closest'
        };

        Plotly.newPlot('plotly-budget-revenue', [trace], layout);

        // Add toggle for log scale
        document.getElementById('toggle-log-scale').addEventListener('click', function() {
            const currentXType = layout.xaxis.type;
            const currentYType = layout.yaxis.type;
            
            layout.xaxis.type = currentXType === 'linear' ? 'log' : 'linear';
            layout.yaxis.type = currentYType === 'linear' ? 'log' : 'linear';
            
            Plotly.relayout('plotly-budget-revenue', {
                'xaxis.type': layout.xaxis.type,
                'yaxis.type': layout.yaxis.type
            });
        });
    }

    // Vega-Lite (Altair) Visualization: Genre Heatmap
    function createGenreHeatmap(data) {
        // Extract genres and count ratings by genre
        const genreRatings = {};
        
        data.forEach(d => {
            const genres = d.genres_flattened.split(' ');
            const rating = parseFloat(d.rating);
            
            if (!isNaN(rating)) {
                genres.forEach(genre => {
                    if (genre) {
                        if (!genreRatings[genre]) {
                            genreRatings[genre] = {
                                counts: Array(10).fill(0), // Ratings 0.5 to 5.0
                                total: 0,
                                average: 0
                            };
                        }
                        
                        // Map rating to index (0.5 -> 0, 1.0 -> 1, etc.)
                        const index = Math.round(rating * 2) - 1;
                        if (index >= 0 && index < 10) {
                            genreRatings[genre].counts[index]++;
                            genreRatings[genre].total++;
                        }
                    }
                });
            }
        });
        
        // Calculate averages and prepare data for heatmap
        const heatmapData = [];
        
        Object.entries(genreRatings).forEach(([genre, data]) => {
            data.average = data.counts.reduce((sum, count, index) => sum + count * (index + 1) * 0.5, 0) / data.total;
            
            // Create heatmap data points
            data.counts.forEach((count, index) => {
                const rating = (index + 1) * 0.5;
                const percentage = (count / data.total) * 100;
                
                heatmapData.push({
                    genre: genre,
                    rating: rating.toFixed(1),
                    count: count,
                    percentage: percentage
                });
            });
        });
        
        // Create Vega-Lite spec
        const spec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": {
                "values": heatmapData
            },
            "mark": "rect",
            "encoding": {
                "x": {
                    "field": "rating",
                    "type": "ordinal",
                    "title": "Rating"
                },
                "y": {
                    "field": "genre",
                    "type": "ordinal",
                    "title": "Genre",
                    "sort": "-x"
                },
                "color": {
                    "field": "percentage",
                    "type": "quantitative",
                    "title": "Percentage of Ratings",
                    "scale": {
                        "scheme": "viridis"
                    }
                },
                "tooltip": [
                    {"field": "genre", "type": "nominal", "title": "Genre"},
                    {"field": "rating", "type": "ordinal", "title": "Rating"},
                    {"field": "count", "type": "quantitative", "title": "Count"},
                    {"field": "percentage", "type": "quantitative", "title": "Percentage", "format": ".1f"}
                ]
            },
            "title": "Rating Distribution by Genre",
            "width": "container",
            "height": 400
        };
        
        // Render the visualization
        vegaEmbed('#vega-genre-heatmap', spec, {actions: false});
    }

    // D3.js Visualization: Popularity Timeline
    function createPopularityTimeline(data) {
        // Clear existing visualization
        d3.select('#d3-popularity-timeline').html('');
    
        // Set up dimensions
        const margin = {top: 40, right: 120, bottom: 60, left: 60};
        const width = document.getElementById('d3-popularity-timeline').clientWidth - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;
    
        // Create SVG container
        const svg = d3.select('#d3-popularity-timeline')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
    
        // Process data: Group by genre and calculate average popularity
        const genreData = d3.rollup(data,
            v => ({
                avgPopularity: d3.mean(v, d => d.popularity),
                movieCount: v.length,
                topMovies: v.sort((a, b) => b.popularity - a.popularity).slice(0, 3)
            }),
            d => d.genres_flattened.split(' ')[0] // Using primary genre
        );
    
        const processedData = Array.from(genreData, ([genre, values]) => ({
            genre: genre,
            avgPopularity: values.avgPopularity,
            movieCount: values.movieCount,
            topMovies: values.topMovies
        })).sort((a, b) => b.avgPopularity - a.avgPopularity);
    
        // Create scales
        const xScale = d3.scaleBand()
            .domain(processedData.map(d => d.genre))
            .range([0, width])
            .padding(0.3);
    
        const yScale = d3.scaleLinear()
            .domain([0, d3.max(processedData, d => d.avgPopularity) * 1.1])
            .range([height, 0]);
    
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    
        // Add axes
        // Add axes with better visibility
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale))
            .selectAll('text')
            .style('text-anchor', 'end')
            .style('fill', 'black')  // Make tick labels black
            .attr('dx', '-0.5em')
            .attr('dy', '-0.5em')
            .attr('transform', 'rotate(-45)');
    
        svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale))
            .selectAll('text')
            .style('fill', 'black');  // Make tick labels black

        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat(''))
            .style('stroke-dasharray', '3,3')
            .style('opacity', 0.1);
    
        // Add bars
        const bars = svg.selectAll('.bar')
            .data(processedData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.genre))
            .attr('width', xScale.bandwidth())
            .attr('y', d => yScale(d.avgPopularity))
            .attr('height', d => height - yScale(d.avgPopularity))
            .attr('fill', d => colorScale(d.genre))
            .attr('opacity', 0.8);
    
        // Add movie count indicators
        svg.selectAll('.movie-count')
            .data(processedData)
            .enter()
            .append('text')
            .attr('class', 'movie-count')
            .attr('x', d => xScale(d.genre) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.avgPopularity) - 5)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text(d => `(${d.movieCount})`);
    
        // Add tooltip
        const tooltip = d3.select('#d3-popularity-timeline')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background-color', 'rgba(0,0,0,0.8)')
            .style('color', 'white')
            .style('padding', '10px')
            .style('border-radius', '5px')
            .style('pointer-events', 'none');
    
        // Add interactivity
        bars.on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1);
    
            tooltip.transition()
                .duration(200)
                .style('opacity', .9);
    
            let tooltipHTML = `
                <strong>Genre:</strong> ${d.genre}<br/>
                <strong>Average Popularity:</strong> ${d.avgPopularity.toFixed(2)}<br/>
                <strong>Number of Movies:</strong> ${d.movieCount}<br/>
                <strong>Top Movies:</strong><br/>
                ${d.topMovies.map(m => `- ${m.title} (${m.popularity.toFixed(1)})`).join('<br/>')}
            `;
    
            tooltip.html(tooltipHTML)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.8);
    
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
    
        // Add labels with better visibility
        svg.append('text')
            .attr('class', 'x-label')
            .attr('text-anchor', 'middle')
            .attr('x', width/2)
            .attr('y', height + margin.bottom)
            .style('font-size', '14px')
            .style('fill', 'black')
            .style('font-weight', 'bold')  // Make label bold
            .text('Genre');

        svg.append('text')
            .attr('class', 'y-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height/2)
            .attr('y', -margin.left + 20)
            .style('font-size', '14px')
            .style('fill', 'black')
            .style('font-weight', 'bold')  // Make label bold
            .text('Average Popularity');
    
        // Add title
        svg.append('text')
            .attr('class', 'chart-title')
            .attr('text-anchor', 'middle')
            .attr('x', width/2)
            .attr('y', -margin.top/2)
            .style('font-size', '1.2em')
            .style('font-weight', 'bold')
            .text('Movie Popularity by Genre (1995)');
    
        // Add interactive legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width + 10}, 10)`);
    
        const legendItems = legend.selectAll('.legend-item')
            .data(processedData)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(0, ${i * 25})`);
    
        legendItems.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('fill', d => colorScale(d.genre))
            .style('opacity', 0.8);
    
        legendItems.append('text')
            .attr('x', 24)
            .attr('y', 9)
            .attr('dy', '.35em')
            .style('fill', 'black')
            .text(d => `${d.genre} (${d.movieCount})`);
    
        // Add click interactivity to legend
        legendItems.style('cursor', 'pointer')
            .on('click', function(event, d) {
                const opacity = bars.filter(b => b.genre === d.genre).style('opacity');
                const newOpacity = opacity === '0.1' ? '0.8' : '0.1';
                
                bars.filter(b => b.genre === d.genre)
                    .transition()
                    .duration(300)
                    .style('opacity', newOpacity);
                    
                d3.select(this).select('rect')
                    .transition()
                    .duration(300)
                    .style('opacity', newOpacity === '0.1' ? 0.3 : 0.8);
            });
    
        // Add average line
        const avgPopularity = d3.mean(processedData, d => d.avgPopularity);
        
        svg.append('line')
            .attr('class', 'average-line')
            .attr('x1', 0)
            .attr('x2', width)
            .attr('y1', yScale(avgPopularity))
            .attr('y2', yScale(avgPopularity))
            .style('stroke', '#ff0000')
            .style('stroke-dasharray', '4')
            .style('opacity', 0);
    
        svg.append('text')
            .attr('class', 'average-label')
            .attr('x', width + 5)
            .attr('y', yScale(avgPopularity))
            .attr('dy', '.35em')
            .style('fill', '#ff0000')
            .style('opacity', 0)
            .text(`Avg: ${avgPopularity.toFixed(2)}`);
    
        // Add button for average line toggle
        const button = d3.select('#d3-popularity-timeline')
            .append('button')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('right', '10px')
            .style('padding', '5px 10px')
            .style('background-color', '#f0f0f0')
            .style('border', '1px solid #ccc')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .text('Show Average')
            .on('click', function() {
                const currentOpacity = svg.select('.average-line').style('opacity');
                const newOpacity = currentOpacity === '0' ? 1 : 0;
                const buttonText = newOpacity === 1 ? 'Hide Average' : 'Show Average';
                
                svg.select('.average-line')
                    .transition()
                    .duration(300)
                    .style('opacity', newOpacity);
                    
                svg.select('.average-label')
                    .transition()
                    .duration(300)
                    .style('opacity', newOpacity);
                    
                d3.select(this).text(buttonText);
            });
    
        // Enhanced tooltip with more information
        let tooltipHTML = d => `
            <div style="background: rgba(0,0,0,0.8); padding: 10px; border-radius: 5px; color: white;">
                <h4 style="margin: 0 0 5px 0; color: ${colorScale(d.genre)}">${d.genre}</h4>
                <p style="margin: 0 0 5px 0">Average Popularity: ${d.avgPopularity.toFixed(2)}</p>
                <p style="margin: 0 0 5px 0">Number of Movies: ${d.movieCount}</p>
                <hr style="border-color: #666; margin: 5px 0">
                <p style="margin: 0 0 5px 0"><strong>Top Movies:</strong></p>
                ${d.topMovies.map((m, i) => 
                    `<p style="margin: 0; padding-left: 10px">${i + 1}. ${m.title} (${m.popularity.toFixed(1)})</p>`
                ).join('')}
                <hr style="border-color: #666; margin: 5px 0">
                <p style="margin: 0; font-size: 0.8em; color: #aaa">Click legend to toggle visibility</p>
            </div>
        `;
    
        // Update tooltip content
        bars.on('mouseover', function(event, d) {
            // ... existing mouseover code ...
            tooltip.html(tooltipHTML(d))
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        });
    
        // Add hover effects for bars
        bars.on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1)
                .attr('stroke', '#000')
                .attr('stroke-width', 2);
    
            tooltip.transition()
                .duration(200)
                .style('opacity', .9);
    
            tooltip.html(tooltipHTML(d))
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.8)
                .attr('stroke-width', 0);
    
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });
    }

    // Plotly Visualization: Runtime vs Rating
    function createRuntimeRatingChart(data) {
        // Process data
        const runtimeRatingData = data.map(d => ({
            runtime: d.runtime,
            rating: d.rating,
            title: d.title,
            vote_count: d.vote_count
        }));

        // Create scatter plot
        const trace = {
            x: runtimeRatingData.map(d => d.runtime),
            y: runtimeRatingData.map(d => d.rating),
            mode: 'markers',
            type: 'scatter',
            text: runtimeRatingData.map(d => `${d.title}<br>Runtime: ${d.runtime} min<br>Rating: ${d.rating}<br>Vote Count: ${d.vote_count}`),
            marker: {
                size: runtimeRatingData.map(d => Math.sqrt(d.vote_count) * 0.5),
                sizemin: 5,
                sizemode: 'area',
                color: runtimeRatingData.map(d => d.runtime),
                colorscale: 'Viridis',
                showscale: true,
                colorbar: {
                    title: 'Runtime (min)'
                }
            },
            hoverinfo: 'text'
        };

        const layout = {
            title: 'Movie Runtime vs User Rating',
            xaxis: {
                title: 'Runtime (minutes)',
                range: [0, d3.max(runtimeRatingData, d => d.runtime) * 1.1]
            },
            yaxis: {
                title: 'User Rating',
                range: [0, 5.5]
            },
            hovermode: 'closest'
        };

        Plotly.newPlot('plotly-runtime-rating', [trace], layout);
    }
});