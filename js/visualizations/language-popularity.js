// Language Popularity Over Time Visualization
document.addEventListener('DOMContentLoaded', function() {
    // Load the data
    d3.csv("../data/movies_data.csv").then(function(data) {
        createLanguagePopularityChart(data);
    }).catch(function(error) {
        console.error("Error loading the data: ", error);
    });

    function createLanguagePopularityChart(data) {
        // Process data - group by language and year
        const languageData = {};
        
        data.forEach(d => {
            const language = d.original_language;
            const year = new Date(d.release_date).getFullYear();
            
            if (!isNaN(year) && language) {
                if (!languageData[language]) {
                    languageData[language] = {};
                }
                
                if (!languageData[language][year]) {
                    languageData[language][year] = 0;
                }
                
                languageData[language][year]++;
            }
        });
        
        // Get top 5 languages by total count
        const languageCounts = {};
        Object.keys(languageData).forEach(lang => {
            languageCounts[lang] = Object.values(languageData[lang]).reduce((a, b) => a + b, 0);
        });
        
        const topLanguages = Object.keys(languageCounts)
            .sort((a, b) => languageCounts[b] - languageCounts[a])
            .slice(0, 5);
        
        // Create year range
        const years = Array.from(new Set(data.map(d => new Date(d.release_date).getFullYear())))
            .filter(year => !isNaN(year))
            .sort();
        
        // Prepare traces for each top language
        const traces = topLanguages.map(language => {
            const yearCounts = years.map(year => languageData[language][year] || 0);
            
            return {
                x: years,
                y: yearCounts,
                type: 'scatter',
                mode: 'lines+markers',
                name: getLanguageName(language),
                hovertemplate: '%{y} movies in %{x}<extra></extra>'
            };
        });
        
        const layout = {
            title: 'Popularity of Top Languages Over Time',
            xaxis: {
                title: 'Year',
                tickmode: 'linear',
                dtick: 5
            },
            yaxis: {
                title: 'Number of Movies'
            },
            hovermode: 'closest',
            legend: {
                orientation: 'h',
                y: -0.2
            }
        };
        
        Plotly.newPlot('language-popularity-chart', traces, layout);
        
        // Add language filter functionality
        createLanguageFilter(Object.keys(languageData), topLanguages);
    }
    
    function createLanguageFilter(allLanguages, defaultSelected) {
        const filterContainer = document.getElementById('language-filter-container');
        filterContainer.innerHTML = '<label>Select Languages:</label>';
        
        const languageNames = allLanguages.map(code => ({
            code: code,
            name: getLanguageName(code)
        })).sort((a, b) => a.name.localeCompare(b.name));
        
        languageNames.forEach(lang => {
            const checkbox = document.createElement('div');
            checkbox.className = 'checkbox-item';
            
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `lang-${lang.code}`;
            input.value = lang.code;
            input.checked = defaultSelected.includes(lang.code);
            
            const label = document.createElement('label');
            label.htmlFor = `lang-${lang.code}`;
            label.textContent = lang.name;
            
            checkbox.appendChild(input);
            checkbox.appendChild(label);
            filterContainer.appendChild(checkbox);
            
            input.addEventListener('change', updateChart);
        });
        
        // Add update button
        const updateButton = document.createElement('button');
        updateButton.textContent = 'Update Chart';
        updateButton.addEventListener('click', updateChart);
        filterContainer.appendChild(updateButton);
        
        function updateChart() {
            const selectedLanguages = Array.from(
                document.querySelectorAll('#language-filter-container input:checked')
            ).map(input => input.value);
            
            if (selectedLanguages.length === 0) {
                alert('Please select at least one language');
                return;
            }
            
            d3.csv("../data/movies_data.csv").then(function(data) {
                // Process data for selected languages
                const languageData = {};
                
                data.forEach(d => {
                    const language = d.original_language;
                    const year = new Date(d.release_date).getFullYear();
                    
                    if (!isNaN(year) && selectedLanguages.includes(language)) {
                        if (!languageData[language]) {
                            languageData[language] = {};
                        }
                        
                        if (!languageData[language][year]) {
                            languageData[language][year] = 0;
                        }
                        
                        languageData[language][year]++;
                    }
                });
                
                // Create year range
                const years = Array.from(new Set(data.map(d => new Date(d.release_date).getFullYear())))
                    .filter(year => !isNaN(year))
                    .sort();
                
                // Prepare traces for each selected language
                const traces = selectedLanguages.map(language => {
                    const yearCounts = years.map(year => languageData[language][year] || 0);
                    
                    return {
                        x: years,
                        y: yearCounts,
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: getLanguageName(language),
                        hovertemplate: '%{y} movies in %{x}<extra></extra>'
                    };
                });
                
                Plotly.react('language-popularity-chart', traces);
            });
        }
    }
    
    function getLanguageName(languageCode) {
        const languageMap = {
            'en': 'English',
            'fr': 'French',
            'es': 'Spanish',
            'de': 'German',
            'it': 'Italian',
            'ja': 'Japanese',
            'zh': 'Chinese',
            'ko': 'Korean',
            'ru': 'Russian',
            'pt': 'Portuguese',
            'hi': 'Hindi'
        };
        
        return languageMap[languageCode] || languageCode;
    }
});