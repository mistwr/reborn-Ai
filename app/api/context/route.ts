// API para obter informacoes contextuais em tempo real
// Fornece: data, hora, tempo meteorologico, localizacao aproximada

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const lat = searchParams.get("lat")
    const lon = searchParams.get("lon")

    // Data e hora atual
    const now = new Date()
    const dateInfo = {
      date: now.toLocaleDateString("pt-PT", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: now.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      timestamp: now.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }

    // Obter tempo meteorologico se tiver coordenadas
    let weather = null
    if (lat && lon) {
      try {
        // Usar Open-Meteo API (gratuita, sem API key)
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`,
        )
        if (weatherRes.ok) {
          const weatherData = await weatherRes.json()
          const current = weatherData.current

          // Mapear codigo do tempo para descricao
          const weatherCodes: Record<number, string> = {
            0: "Ceu limpo",
            1: "Principalmente limpo",
            2: "Parcialmente nublado",
            3: "Nublado",
            45: "Nevoeiro",
            48: "Nevoeiro com geada",
            51: "Chuviscos leves",
            53: "Chuviscos moderados",
            55: "Chuviscos densos",
            61: "Chuva fraca",
            63: "Chuva moderada",
            65: "Chuva forte",
            71: "Neve fraca",
            73: "Neve moderada",
            75: "Neve forte",
            80: "Aguaceiros fracos",
            81: "Aguaceiros moderados",
            82: "Aguaceiros fortes",
            95: "Trovoada",
            96: "Trovoada com granizo",
            99: "Trovoada com granizo forte",
          }

          weather = {
            temperature: Math.round(current.temperature_2m),
            humidity: current.relative_humidity_2m,
            windSpeed: Math.round(current.wind_speed_10m),
            description: weatherCodes[current.weather_code] || "Desconhecido",
            code: current.weather_code,
          }
        }
      } catch (e) {
        // Ignorar erros de tempo
      }
    }

    // Obter localizacao aproximada por IP (gratuito)
    let location = null
    try {
      const ipRes = await fetch("https://ipapi.co/json/")
      if (ipRes.ok) {
        const ipData = await ipRes.json()
        location = {
          city: ipData.city,
          region: ipData.region,
          country: ipData.country_name,
          countryCode: ipData.country_code,
        }
      }
    } catch (e) {
      // Ignorar erros de localizacao
    }

    return Response.json({
      success: true,
      ...dateInfo,
      weather,
      location,
    })
  } catch (error) {
    return Response.json({
      success: false,
      date: new Date().toLocaleDateString("pt-PT"),
      time: new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
      timestamp: new Date().toISOString(),
    })
  }
}
