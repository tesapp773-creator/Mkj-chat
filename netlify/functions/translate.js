exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Only POST requests are allowed." }),
    };
  }

  try {
    const { text, sourceLanguage, targetLanguage } = JSON.parse(event.body);

    if (!text || !sourceLanguage || !targetLanguage) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "text, sourceLanguage and targetLanguage are required.",
        }),
      };
    }

    const response = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nvidia/riva-translate-4b-instruct-v2",
          messages: [
            {
              role: "system",
              content: `${sourceLanguage}-${targetLanguage}`,
            },
            {
              role: "user",
              content: text,
            },
          ],
          temperature: 0,
          max_tokens: 512,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        translation: data.choices?.[0]?.message?.content ?? "",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
