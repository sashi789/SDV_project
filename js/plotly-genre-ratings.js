// Plotly Genre Ratings Visualization
document.addEventListener('DOMContentLoaded', function() {
    // Load the data
    d3.csv("../data/movies_data.csv").then(function(data) {
        // Process data
        data.forEach(d => {
            d.rating = +d.rating;
            d.vote_average = +d.vote_average;
        });

        // Extract genres and create genre-rating pairs
        const genreRatings = [];
        data.forEach(movie => {
            if (movie.genres_flattened) {
                const genres = movie.genres_flattened.split(', ');
                genres.forEach(genre => {
                    if (genre) {
                        genreRatings.push({
                            genre: genre.trim(),
                            rating: movie.rating,
                            vote_average: movie.vote_average
                        });
                    }
                });
            }
        });

        // Calculate average ratings by genre
        const genreMap = new Map();
        genreRatings.forEach(item => {
            if (!genreMap.has(item.genre)) {
                genreMap.set(item.genre, {
                    count: 0,
                    totalRating: 0,
                    totalVoteAverage: 0,
                    ratings: []
                });
            }
            
            const genreData = genreMap.get(item.genre);
            genreData.count++;
            genreData.totalRating += item.rating;
            genreData.totalVoteAverage += item.vote_average;
            genreData.ratings.push(item.rating);
        });

        // Convert to array and calculate averages
        const genreAverages = Array.from(genreMap, ([genre, data]) => ({
            genre,
            avgRating: data.totalRating / data.count,
            avgVoteAverage: data.totalVoteAverage / data.count,
            count: data.count,
            ratings: data.ratings
        }))
        .filter(d => d.count > 10) // Filter out genres with few ratings
        .sort((a, b) => b.avgRating - a.avgRating); // Sort by average rating

        // Create bar chart for average ratings
        function createAverageRatingsChart() {
            const trace = {
                x: genreAverages.map(d => d.genre),
                y: genreAverages.map(d => d.avgRating),
                type: 'bar',
                marker: {
                    color: genreAverages.map(d => d.avgRating),
                    colorscale: 'Viridis'
                },
                hovertemplate: '<b>%{x}</b><br>' +
                               'Average Rating: %{y:.2f}<br>' +
                               'Sample Size: %{text}<extra></extra>',
                text: genreAverages.map(d => d.count)
            };

            const layout = {
                title: 'Average User Ratings by Genre',
                xaxis: {
                    title: 'Genre',
                    tickangle: -45
                },
                yaxis: {
                    title: 'Average Rating',
                    range: [0, 5]
                },
                margin: {
                    b: 120
                }
            };

            Plotly.newPlot('plotly-genre-ratings', [trace], layout, {responsive: true});
        }

        // Create box plot for rating distributions
        function createRatingDistributionChart() {
            const traces = genreAverages.map(genre => ({
                y: genre.ratings,
                type: 'box',
                name: genre.genre,
                boxpoints: 'outliers',
                jitter: 0.3,
                pointpos: 0,
                marker: {
                    size: 3
                },
                hoverinfo: 'y+name'
            }));

            const layout = {
                title: 'Rating Distribution by Genre',
                yaxis: {
                    title: 'User Rating',
                    range: [0, 5.5]
                },
                margin: {
                    b: 120
                },
                showlegend: false
            };

            Plotly.newPlot('plotly-genre-ratings', traces, layout, {responsive: true});
        }

        // Create comparison chart (user ratings vs critic ratings)
        function createComparisonChart() {
            const trace1 = {
                x: genreAverages.map(d => d.genre),
                y: genreAverages.map(d => d.avgRating),
                name: 'User Ratings',
                type: 'bar',
                marker: {
                    color: 'rgba(58, 171, 174, 0.7)'
                }
            };

            const trace2 = {
                x: genreAverages.map(d => d.genre),
                y: genreAverages.map(d => d.avgVoteAverage / 2), // Scale to same 0-5 range
                name: 'Critic Ratings (scaled)',
                type: 'bar',
                marker: {
                    color: 'rgba(213, 94, 0, 0.7)'
                }
            };

            const layout = {
                title: 'User vs Critic Ratings by Genre',
                xaxis: {
                    title: 'Genre',
                    tickangle: -45
                },
                yaxis: {
                    title: 'Rating (0-5 scale)',
                    range: [0, 5]
                },
                barmode: 'group',
                margin: {
                    b: 120
                }
            };

            Plotly.newPlot('plotly-genre-ratings', [trace1, trace2], layout, {responsive: true});
        }

        // Initial chart
        createAverageRatingsChart();

        // Add event listeners for chart type selection
        if (document.getElementById('chart-type')) {
            document.getElementById('chart-type').addEventListener('change', function() {
                const chartType = this.value;
                
                if (chartType === 'average') {
                    createAverageRatingsChart();
                } else if (chartType === 'distribution') {
                    createRatingDistributionChart();
                } else if (chartType === 'comparison') {
                    createComparisonChart();
                }
            });
        }
    }).catch(function(error) {
        console.error("Error loading the data:", error);
    });
});