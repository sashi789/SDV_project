// Interactive Visualizations JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Load the data
    Promise.all([
        d3.json('../data/movies_sample.json')
    ]).then(function(data) {
        const moviesData = data[0];
        
        // Initialize all visualizations
        createD3GenreEvolution(moviesData);
        createPlotlyBudgetRevenue(moviesData);
        createVegaRatingHeatmap(moviesData);
        
        // Set up event listeners for controls
        setupEventListeners(moviesData);
    }).catch(function(error) {
        console.error('Error loading data:', error);
        // Display a user-friendly error message
        document.querySelectorAll('.chart-container').forEach(container => {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h3>Error Loading Data</h3>
                    <p>We couldn't load the visualization data. Please try refreshing the page.</p>
                    <p>Technical details: ${error.message}</p>
                </div>
            `;
        });
    });
});

// Set up event listeners for all visualization controls
function setupEventListeners(moviesData) {
    // D3 Genre Evolution controls
    document.getElementById('d3-start-year').addEventListener('change', function() {
        createD3GenreEvolution(moviesData);
    });
    
    document.getElementById('d3-end-year').addEventListener('change', function() {
        createD3GenreEvolution(moviesData);
    });
    
    document.getElementById('d3-top-genres').addEventListener('change', function() {
        createD3GenreEvolution(moviesData);
    });
    
    // Plotly Budget vs Revenue controls
    document.getElementById('plotly-year-range').addEventListener('change', function() {
        createPlotlyBudgetRevenue(moviesData);
    });
    
    document.getElementById('plotly-min-votes').addEventListener('change', function() {
        createPlotlyBudgetRevenue(moviesData);
    });
    
    // Vega-Lite Rating Heatmap controls
    document.getElementById('vega-aggregation').addEventListener('change', function() {
        createVegaRatingHeatmap(moviesData);
    });
    
    document.getElementById('vega-color-scheme').addEventListener('change', function() {
        createVegaRatingHeatmap(moviesData);
    });
    
    document.getElementById('vega-bin-size').addEventListener('change', function() {
        createVegaRatingHeatmap(moviesData);
    });
}

// D3.js Visualization: Genre Evolution Over Time
function createD3GenreEvolution(moviesData) {
    // Get filter values
    const startYear = parseInt(document.getElementById('d3-start-year').value);
    const endYear = parseInt(document.getElementById('d3-end-year').value);
    const topGenresCount = parseInt(document.getElementById('d3-top-genres').value);
    
    // Clear previous visualization
    d3.select('#d3-genre-evolution').html('');
    
    // Filter data by year range
    const filteredData = moviesData.filter(movie => {
        const year = new Date(movie.release_date).getFullYear();
        return year >= startYear && year <= endYear && movie.genres && movie.genres.length > 0;
    });
    
    // Process data for stacked area chart
    // Group movies by year and genre
    const genreCounts = {};
    
    filteredData.forEach(movie => {
        const year = new Date(movie.release_date).getFullYear();
        
        // Use the first genre as the primary genre
        const primaryGenre = movie.genres[0].name;
        
        if (!genreCounts[year]) {
            genreCounts[year] = {};
        }
        
        if (!genreCounts[year][primaryGenre]) {
            genreCounts[year][primaryGenre] = 0;
        }
        
        genreCounts[year][primaryGenre]++;
    });
    
    // Convert to array format for D3
    const yearData = Object.keys(genreCounts).map(year => {
        const yearObj = { year: parseInt(year) };
        Object.keys(genreCounts[year]).forEach(genre => {
            yearObj[genre] = genreCounts[year][genre];
        });
        return yearObj;
    });
    
    // Sort by year
    yearData.sort((a, b) => a.year - b.year);
    
    // Get top genres by total count
    const genreTotals = {};
    yearData.forEach(yearObj => {
        Object.keys(yearObj).forEach(key => {
            if (key !== 'year') {
                if (!genreTotals[key]) {
                    genreTotals[key] = 0;
                }
                genreTotals[key] += yearObj[key];
            }
        });
    });
    
    const topGenres = Object.keys(genreTotals)
        .sort((a, b) => genreTotals[b] - genreTotals[a])
        .slice(0, topGenresCount);
    
    // Set up dimensions and margins
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const width = document.getElementById('d3-genre-evolution').clientWidth - margin.left - margin.right;
    const height = document.getElementById('d3-genre-evolution').clientHeight - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select('#d3-genre-evolution')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const x = d3.scaleLinear()
        .domain(d3.extent(yearData, d => d.year))
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain([0, 1])  // For percentage
        .range([height, 0]);
    
    // Create color scale
    const color = d3.scaleOrdinal()
        .domain(topGenres)
        .range(d3.schemeCategory10);
    
    // Stack the data
    const stack = d3.stack()
        .keys(topGenres)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetExpand);  // Normalize to show percentage
    
    const stackedData = stack(yearData);
    
    // Create area generator
    const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]));
    
    // Add areas
    svg.selectAll('.area')
        .data(stackedData)
        .enter()
        .append('path')
        .attr('class', 'area')
        .attr('d', area)
        .style('fill', d => color(d.key))
        .style('opacity', 0.8)
        .on('mouseover', function(event, d) {
            d3.select(this).style('opacity', 1);
            
            // Show tooltip
            const tooltip = d3.select('body')
                .append('div')
                .attr('class', 'tooltip')
                .style('opacity', 0);
            
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
            
            tooltip.html(`Genre: ${d.key}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this).style('opacity', 0.8);
            d3.select('.tooltip').remove();
        });
    
    // Add axes
    const xAxis = d3.axisBottom(x)
        .tickFormat(d3.format('d'))  // Format as integer
        .ticks(Math.min(endYear - startYear, 10));
    
    const yAxis = d3.axisLeft(y)
        .tickFormat(d3.format('.0%'));  // Format as percentage
    
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis);
    
    svg.append('g')
        .call(yAxis);
    
    // Add axis labels
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', `translate(${width/2},${height + margin.bottom - 10})`)
        .text('Year');
    
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', `translate(${-margin.left + 15},${height/2})rotate(-90)`)
        .text('Percentage of Movies');
    
    // Add legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 120}, 0)`);
    
    topGenres.forEach((genre, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);
        
        legendRow.append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .attr('fill', color(genre));
        
        legendRow.append('text')
            .attr('x', 15)
            .attr('y', 10)
            .attr('text-anchor', 'start')
            .style('font-size', '12px')
            .text(genre);
    });
    
    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .text(`Genre Evolution (${startYear}-${endYear})`);
}

// Plotly Visualization: Budget vs Revenue by Genre
function createPlotlyBudgetRevenue(moviesData) {
    // Get filter values
    const yearRange = document.getElementById('plotly-year-range').value;
    const minVotes = parseInt(document.getElementById('plotly-min-votes').value);
    
    // Parse year range
    let startYear = 1900;
    let endYear = 2023;
    
    if (yearRange !== 'all') {
        const years = yearRange.split('-');
        startYear = parseInt(years[0]);
        endYear = parseInt(years[1]);
    }
    
    // Filter data
    const filteredData = moviesData.filter(movie => {
        const year = new Date(movie.release_date).getFullYear();
        return year >= startYear && 
               year <= endYear && 
               movie.vote_count >= minVotes &&
               movie.budget > 0 &&  // Only include movies with budget data
               movie.revenue > 0 &&  // Only include movies with revenue data
               movie.genres && 
               movie.genres.length > 0;
    });
    
    // Get unique genres
    const allGenres = new Set();
    filteredData.forEach(movie => {
        movie.genres.forEach(genre => {
            allGenres.add(genre.name);
        });
    });
    
    // Create genre checkboxes if they don't exist
    const genreCheckboxes = document.getElementById('plotly-genre-checkboxes');
    if (genreCheckboxes.children.length === 0) {
        Array.from(allGenres).sort().forEach(genre => {
            const checkboxDiv = document.createElement('div');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `genre-${genre.replace(/\s+/g, '-').toLowerCase()}`;
            checkbox.value = genre;
            checkbox.checked = true;
            checkbox.addEventListener('change', () => createPlotlyBudgetRevenue(moviesData));
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = genre;
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            genreCheckboxes.appendChild(checkboxDiv);
        });
    }
    
    // Get selected genres
    const selectedGenres = Array.from(document.querySelectorAll('#plotly-genre-checkboxes input:checked')).map(cb => cb.value);
    
    // Further filter by selected genres
    const genreFilteredData = filteredData.filter(movie => {
        return movie.genres.some(genre => selectedGenres.includes(genre.name));
    });
    
    // Create traces for each genre
    const traces = [];
    
    selectedGenres.forEach(genre => {
        const genreMovies = genreFilteredData.filter(movie => 
            movie.genres.some(g => g.name === genre)
        );
        
        if (genreMovies.length > 0) {
            traces.push({
                x: genreMovies.map(movie => movie.budget),
                y: genreMovies.map(movie => movie.revenue),
                mode: 'markers',
                type: 'scatter',
                name: genre,
                text: genreMovies.map(movie => `${movie.title} (${new Date(movie.release_date).getFullYear()})<br>Budget: $${formatMoney(movie.budget)}<br>Revenue: $${formatMoney(movie.revenue)}<br>ROI: ${calculateROI(movie.budget, movie.revenue)}%`),
                hoverinfo: 'text',
                marker: {
                    size: genreMovies.map(movie => Math.min(Math.sqrt(movie.vote_count) / 2, 20)),
                    opacity: 0.7
                }
            });
        }
    });
    
    // Add break-even line
    const allBudgets = genreFilteredData.map(movie => movie.budget);
    const allRevenues = genreFilteredData.map(movie => movie.revenue);
    const maxValue = Math.max(...allBudgets, ...allRevenues);
    const minValue = Math.min(...allBudgets.filter(b => b > 0), ...allRevenues.filter(r => r > 0));
    
    traces.push({
        x: [minValue, maxValue],
        y: [minValue, maxValue],
        mode: 'lines',
        type: 'scatter',
        name: 'Break Even',
        line: {
            color: 'rgba(0, 0, 0, 0.5)',
            dash: 'dash'
        }
    });
    
    // Create layout
    const layout = {
        title: `Budget vs. Revenue (${yearRange}, ${minVotes}+ votes)`,
        xaxis: {
            title: 'Budget (USD)',
            type: 'log',
            autorange: true
        },
        yaxis: {
            title: 'Revenue (USD)',
            type: 'log',
            autorange: true
        },
        hovermode: 'closest',
        legend: {
            orientation: 'h',
            y: -0.2
        },
        margin: {
            l: 60,
            r: 30,
            t: 50,
            b: 100
        }
    };
    
    // Create plot
    Plotly.newPlot('plotly-budget-revenue', traces, layout, {responsive: true});
}

// Vega-Lite (Altair) Visualization: Rating Distribution by Year
function createVegaRatingHeatmap(moviesData) {
    // Get filter values
    const aggregation = document.getElementById('vega-aggregation').value;
    const colorScheme = document.getElementById('vega-color-scheme').value;
    const binSize = parseFloat(document.getElementById('vega-bin-size').value);
    
    // Filter data
    const filteredData = moviesData.filter(movie => 
        movie.vote_average > 0 && 
        movie.vote_count > 10 && 
        movie.release_date
    );
    
    // Process data for Vega-Lite
    const processedData = filteredData.map(movie => {
        return {
            year: new Date(movie.release_date).getFullYear(),
            rating: movie.vote_average,
            vote_count: movie.vote_count,
            title: movie.title
        };
    });
    
    // Create Vega-Lite spec
    const spec = {
        $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
        data: {
            values: processedData
        },
        width: 'container',
        height: 400,
        mark: 'rect',
        encoding: {
            x: {
                field: 'year',
                type: 'ordinal',
                title: 'Release Year'
            },
            y: {
                field: 'rating',
                type: 'quantitative',
                bin: {step: binSize},
                title: 'Rating'
            },
            color: {
                aggregate: aggregation,
                field: aggregation === 'count' ? null : 'vote_count',
                type: 'quantitative',
                scale: {
                    scheme: colorScheme
                },
                title: aggregation === 'count' ? 'Number of Movies' : 
                       aggregation === 'average' ? 'Avg Vote Count' : 'Total Vote Count'
            },
            tooltip: [
                {field: 'year', type: 'ordinal', title: 'Year'},
                {field: 'rating', type: 'quantitative', title: 'Rating', format: '.1f'},
                {aggregate: 'count', type: 'quantitative', title: 'Number of Movies'},
                {aggregate: 'mean', field: 'vote_count', type: 'quantitative', title: 'Avg Vote Count', format: '.0f'},
                {aggregate: 'sum', field: 'vote_count', type: 'quantitative', title: 'Total Vote Count', format: '.0f'}
            ]
        }
    };
    
    // Render the visualization
    vegaEmbed('#vega-rating-heatmap', spec, {
        actions: {
            export: true,
            source: false,
            compiled: false,
            editor: false
        }
    }).catch(console.error);
}

// Helper function to format money values
function formatMoney(amount) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Helper function to calculate ROI (Return on Investment)
function calculateROI(budget, revenue) {
    if (budget <= 0) return 'N/A';
    const roi = ((revenue - budget) / budget) * 100;
    return roi.toFixed(1);
}

// Helper function to get decade from year
function getDecade(year) {
    return Math.floor(year / 10) * 10 + 's';
}

// Helper function to create a color scale based on genre
function getGenreColorScale() {
    return {
        'Action': '#e94560',
        'Adventure': '#ffa41b',
        'Animation': '#1eb980',
        'Comedy': '#ffbd39',
        'Crime': '#607d8b',
        'Documentary': '#795548',
        'Drama': '#3282b8',
        'Family': '#4caf50',
        'Fantasy': '#c04de2',
        'History': '#8d6e63',
        'Horror': '#ff5252',
        'Music': '#9c27b0',
        'Mystery': '#7579e7',
        'Romance': '#ff85a2',
        'Science Fiction': '#6a4c93',
        'TV Movie': '#9e9e9e',
        'Thriller': '#455a64',
        'War': '#bf360c',
        'Western': '#8d6e63'
    };
}

// Helper function to get a color for a genre
function getGenreColor(genre, colorScale) {
    const scale = colorScale || getGenreColorScale();
    return scale[genre] || '#cccccc';
}

// Helper function to create a tooltip
function createTooltip() {
    return d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);
}

// Helper function to show tooltip
function showTooltip(tooltip, html, event) {
    tooltip.transition()
        .duration(200)
        .style('opacity', 0.9);
    
    tooltip.html(html)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 28) + 'px');
}

// Helper function to hide tooltip
function hideTooltip(tooltip) {
    tooltip.transition()
        .duration(500)
        .style('opacity', 0)
        .remove();
}

// Helper function to create a responsive SVG container
function createResponsiveSvg(container, margin) {
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    return { svg, width, height };
}

// Helper function to add a title to an SVG
function addSvgTitle(svg, title, width) {
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(title);
}

// Helper function to add axis labels
function addAxisLabels(svg, xLabel, yLabel, width, height, margin) {
    // X-axis label
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', `translate(${width/2},${height + margin.bottom - 10})`)
        .style('font-size', '12px')
        .text(xLabel);
    
    // Y-axis label
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', `translate(${-margin.left + 15},${height/2})rotate(-90)`)
        .style('font-size', '12px')
        .text(yLabel);
}