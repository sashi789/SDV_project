// Vega-Lite (Altair) Popularity Trends Visualization
document.addEventListener('DOMContentLoaded', function() {
    // Load the data
    d3.csv("../data/movies_data.csv").then(function(data) {
        // Process data
        data.forEach(d => {
            d.release_date = new Date(d.release_date);
            d.release_year = d.release_date.getFullYear();
            d.popularity = +d.popularity;
            d.vote_average = +d.vote_average;
            d.vote_count = +d.vote_count;
        });

        // Filter out invalid dates and get unique movies
        const validData = data.filter(d => !isNaN(d.release_year) && d.release_year > 1900 && d.release_year < 2023);
        
        // Get unique movies
        const uniqueMovies = Array.from(
            d3.group(validData, d => d.title),
            ([title, movies]) => {
                const movie = movies[0]; // Take first instance of each movie
                return {
                    title: movie.title,
                    release_year: movie.release_year,
                    popularity: movie.popularity,
                    vote_average: movie.vote_average,
                    vote_count: movie.vote_count,
                    genres: movie.genres_flattened
                };
            }
        );

        // Create Vega-Lite spec for popularity trends
        const vlSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            width: 800,
            height: 400,
            data: {values: uniqueMovies},
            mark: {
                type: 'circle',
                opacity: 0.7,
                tooltip: true
            },
            encoding: {
                x: {
                    field: 'release_year',
                    type: 'temporal',
                    timeUnit: 'year',
                    title: 'Release Year'
                },
                y: {
                    field: 'popularity',
                    type: 'quantitative',
                    title: 'Popularity'
                },
                size: {
                    field: 'vote_count',
                    type: 'quantitative',
                    title: 'Vote Count',
                    scale: {
                        range: [10, 300]
                    }
                },
                color: {
                    field: 'vote_average',
                    type: 'quantitative',
                    title: 'Average Rating',
                    scale: {
                        scheme: 'viridis'
                    }
                },
                tooltip: [
                    {field: 'title', type: 'nominal', title: 'Movie'},
                    {field: 'release_year', type: 'temporal', timeUnit: 'year', title: 'Year'},
                    {field: 'popularity', type: 'quantitative', title: 'Popularity', format: '.1f'},
                    {field: 'vote_average', type: 'quantitative', title: 'Rating', format: '.1f'},
                    {field: 'vote_count', type: 'quantitative', title: 'Vote Count'},
                    {field: 'genres', type: 'nominal', title: 'Genres'}
                ]
            },
            title: {
                text: 'Movie Popularity Trends Over Time',
                fontSize: 20
            }
        };

        // Render the visualization
        vegaEmbed('#vega-popularity-trends', vlSpec, {actions: false})
            .catch(console.error);

        // Create a second visualization for genre popularity over time
        // First, process data for genre trends
        const genresByYear = new Map();
        
        uniqueMovies.forEach(movie => {
            if (movie.genres) {
                const year = movie.release_year;
                const genres = movie.genres.split(', ');
                
                if (!genresByYear.has(year)) {
                    genresByYear.set(year, new Map());
                }
                
                const yearData = genresByYear.get(year);
                
                genres.forEach(genre => {
                    if (genre) {
                        const genreTrimmed = genre.trim();
                        if (!yearData.has(genreTrimmed)) {
                            yearData.set(genreTrimmed, {
                                count: 0,
                                totalPopularity: 0,
                                totalRating: 0
                            });
                        }
                        
                        const genreData = yearData.get(genreTrimmed);
                        genreData.count++;
                        genreData.totalPopularity += movie.popularity;
                        genreData.totalRating += movie.vote_average;
                    }
                });
            }
        });
        
        // Convert to array format for Vega-Lite
        const genreTrends = [];
        genresByYear.forEach((genreMap, year) => {
            genreMap.forEach((data, genre) => {
                if (data.count >= 3) { // Only include genres with enough movies in that year
                    genreTrends.push({
                        year: year,
                        genre: genre,
                        count: data.count,
                        avgPopularity: data.totalPopularity / data.count,
                        avgRating: data.totalRating / data.count
                    });
                }
            });
        });
        
        // Filter to top genres only to avoid cluttering
        const topGenres = Array.from(
            d3.rollup(
                genreTrends, 
                v => d3.sum(v, d => d.count), 
                d => d.genre
            ),
            ([genre, count]) => ({genre, count})
        )
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(d => d.genre);
        
        const filteredGenreTrends = genreTrends.filter(d => topGenres.includes(d.genre));
        
        // Create Vega-Lite spec for genre trends
        const genreTrendsSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            width: 800,
            height: 400,
            data: {values: filteredGenreTrends},
            mark: {
                type: 'line',
                point: true
            },
            encoding: {
                x: {
                    field: 'year',
                    type: 'temporal',
                    timeUnit: 'year',
                    title: 'Year'
                },
                y: {
                    field: 'avgPopularity',
                    type: 'quantitative',
                    title: 'Average Popularity'
                },
                color: {
                    field: 'genre',
                    type: 'nominal',
                    title: 'Genre'
                },
                tooltip: [
                    {field: 'genre', type: 'nominal', title: 'Genre'},
                    {field: 'year', type: 'temporal', timeUnit: 'year', title: 'Year'},
                    {field: 'avgPopularity', type: 'quantitative', title: 'Avg Popularity', format: '.1f'},
                    {field: 'avgRating', type: 'quantitative', title: 'Avg Rating', format: '.1f'},
                    {field: 'count', type: 'quantitative', title: 'Movie Count'}
                ]
            },
            title: {
                text: 'Genre Popularity Trends Over Time',
                fontSize: 20
            }
        };
        
        // Render the genre trends visualization
        vegaEmbed('#vega-genre-trends', genreTrendsSpec, {actions: false})
            .catch(console.error);
    }).catch(function(error) {
        console.error("Error loading the data:", error);
    });
});