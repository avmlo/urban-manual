/**
 * Open-Meteo Weather API Integration
 * Free weather API with no API key required
 */

export interface WeatherData {
  current: {
    temperature: number;
    weatherCode: number;
    weatherDescription: string;
    humidity: number;
    windSpeed: number;
    windDirection: number;
  };
  forecast: Array<{
    date: string;
    temperatureMax: number;
    temperatureMin: number;
    weatherCode: number;
    weatherDescription: string;
    precipitationProbability: number;
  }>;
  bestMonths: number[]; // Array of month numbers (1-12) for best visit times
}

/**
 * Get weather code description
 */
function getWeatherDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return weatherCodes[code] || 'Unknown';
}

/**
 * Fetch current weather and forecast for a location
 */
export async function fetchWeather(
  latitude: number,
  longitude: number
): Promise<WeatherData | null> {
  try {
    // Current weather
    const currentResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${latitude}&longitude=${longitude}&` +
      `current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&` +
      `timezone=auto`
    );

    if (!currentResponse.ok) {
      throw new Error(`Weather API error: ${currentResponse.status}`);
    }

    const currentData = await currentResponse.json();

    // 7-day forecast
    const forecastResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${latitude}&longitude=${longitude}&` +
      `daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&` +
      `timezone=auto&forecast_days=7`
    );

    if (!forecastResponse.ok) {
      throw new Error(`Forecast API error: ${forecastResponse.status}`);
    }

    const forecastData = await forecastResponse.json();

    const current = currentData.current;
    const forecast = forecastData.daily;

    // Determine best months to visit (simplified: months with good weather)
    // This is a simple heuristic - could be enhanced with historical data
    const bestMonths = calculateBestMonths(latitude, longitude);

    return {
      current: {
        temperature: current.temperature_2m,
        weatherCode: current.weather_code,
        weatherDescription: getWeatherDescription(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
      },
      forecast: forecast.time.map((date: string, index: number) => ({
        date,
        temperatureMax: forecast.temperature_2m_max[index],
        temperatureMin: forecast.temperature_2m_min[index],
        weatherCode: forecast.weather_code[index],
        weatherDescription: getWeatherDescription(forecast.weather_code[index]),
        precipitationProbability: forecast.precipitation_probability_max[index],
      })),
      bestMonths,
    };
  } catch (error: any) {
    console.error(`Error fetching weather for ${latitude}, ${longitude}:`, error.message);
    return null;
  }
}

/**
 * Calculate best months to visit based on latitude
 * Simple heuristic - could be enhanced with historical weather data
 */
function calculateBestMonths(latitude: number, longitude: number): number[] {
  // Northern hemisphere: April-October are generally good
  // Southern hemisphere: October-April are generally good
  // Tropics: Year-round is good
  
  if (Math.abs(latitude) < 23.5) {
    // Tropics - year round
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  } else if (latitude > 0) {
    // Northern hemisphere
    return [4, 5, 6, 7, 8, 9, 10];
  } else {
    // Southern hemisphere
    return [10, 11, 12, 1, 2, 3, 4];
  }
}

/**
 * Get weather emoji for weather code
 */
export function getWeatherEmoji(code: number): string {
  const emojiMap: Record<number, string> = {
    0: '☀️',
    1: '🌤️',
    2: '⛅',
    3: '☁️',
    45: '🌫️',
    48: '🌫️',
    51: '🌦️',
    53: '🌦️',
    55: '🌧️',
    61: '🌧️',
    63: '🌧️',
    65: '⛈️',
    71: '🌨️',
    73: '🌨️',
    75: '❄️',
    77: '❄️',
    80: '🌦️',
    81: '🌧️',
    82: '⛈️',
    85: '🌨️',
    86: '❄️',
    95: '⛈️',
    96: '⛈️',
    99: '⛈️',
  };
  return emojiMap[code] || '🌤️';
}

