import { Hono } from 'hono';
import { OpenAI } from 'openai';
import * as cheerio from 'cheerio';

type Bindings = {
  OPENAI_API_KEY: string;
  CPP_ARCHITECTURE_TOKEN: string;
  CPP_PERFORMANCE_TOKEN: string;
  ML_RESOURCE_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

async function read_website_content(url: string): Promise<string> {
  console.log('reading website content');
  const response = await fetch(url);
  const body = await response.text();
  const cheerioBody = cheerio.load(body);
  return cheerioBody('p').text();
}

async function cppArchitectureAndDesign(content: string, token: string) {
  const prompt = `Any information on the given topics from the context would be great. Please list chapters from the table of contents if possible. Here is my context to searched against your context "${content}"`;

  try{
    const response = await fetch('https://api.langbase.com/beta/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();
    console.log('Parsed response:', JSON.stringify(jsonData, null, 2));

    if (jsonData.completion) {
      const innerData = JSON.parse(jsonData.completion);
      return innerData;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    console.error('Error in cppArchitectureAndDesign:', error);
    return { Answer: ["Error occurred while fetching data"] };
  }
}

async function cppPerformanceAndConcurrency(content: string, token: string) {
  const prompt = `Any information on the given topics from the context would be great. Please list chapters from the table of contents if possible. Here is my context to searched against your context "${content}"`;
  try{

    const response = await fetch('https://api.langbase.com/beta/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();
    console.log('Parsed response:', JSON.stringify(jsonData, null, 2));

    if (jsonData.completion) {
      const innerData = JSON.parse(jsonData.completion);
      return innerData;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    console.error('Error in cppPerformanceAndConcurrency:', error);
    return { Answer: ["Error occurred while fetching data"] };
  }
}

async function machineLearningResource(content: string, token: string) {
  const prompt = `Any information on the given topics from the context would be great. Please list chapters from the table of contents if possible. Here is my context to searched against your context "${content}"`;
  try{

    const response = await fetch('https://api.langbase.com/beta/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const jsonData = await response.json();
    console.log('Parsed response:', JSON.stringify(jsonData, null, 2));

    if (jsonData.completion) {
      const innerData = JSON.parse(jsonData.completion);
      return innerData;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    console.error('Error in machineLearningResource:', error);
    return { Answer: ["Error occurred while fetching data"] };
  }
 
}

app.use('*', async (c, next) => {
  if (!c.env.OPENAI_API_KEY) {
    return c.text('OPENAI_API_KEY is not set', 500);
  }
  await next();
});

async function processWebsiteContent(c: any, url: string) {
  const openai = new OpenAI({
    apiKey: c.env.OPENAI_API_KEY,
  });

  const websiteContent = await read_website_content(url);

  // Summarize content
  const summarizeCompletion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: `Provide a concise summary of the following content:\n\n${websiteContent}` }],
  });
  const summary = summarizeCompletion.choices[0].message.content;

  // Extract key topics
  const keyTopicsCompletion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: `List the key topics from the following content:\n\n${websiteContent}` }],
  });
  const keyTopics = keyTopicsCompletion.choices[0].message.content;

  const contextMap = { summary, keyTopics };
  const content = `Summary: ${contextMap.summary}\n\nKey Topics: ${contextMap.keyTopics}`;
  console.log(`Summary: ${contextMap.summary}\n\nKey Topics: ${contextMap.keyTopics}`)
  console.log(`\n\nContent to be send ${content}`)

  // Call the three endpoints
  const cppArchitectureResponse = await cppArchitectureAndDesign(content, c.env.CPP_ARCHITECTURE_TOKEN);
  const performanceResponse = await cppPerformanceAndConcurrency(content, c.env.CPP_PERFORMANCE_TOKEN);
  const mlTopicsResponse = await machineLearningResource(content, c.env.ML_RESOURCE_TOKEN);

    // Helper function to check if the response is valid
  const isValidResponse = (response: any) => {
    return response && Array.isArray(response.Answer) && response.Answer.length > 0;
  };

  // Filter out invalid responses and those with "Not found in the context"
  const responses = [
    { name: 'C++ Architecture and Design', data: cppArchitectureResponse },
    { name: 'C++ Performance and Concurrency', data: performanceResponse },
    { name: 'Machine Learning Resources', data: mlTopicsResponse },
  ].filter((response) => isValidResponse(response.data) && response.data.Answer[0] !== "Not found in context.");

  return responses;
}

app.get('/analyze', async (c) => {
  const url = c.req.query('url');
  if (!url) {
    return c.text('URL parameter is required', 400);
  }

  const responses = await processWebsiteContent(c, url);

  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Website Analysis</title>
    </head>
    <body>
      <h1>Analysis of ${url}</h1>
  `;

  for (const response of responses) {
    htmlContent += `
      <h2>${response.name}</h2>
      <ul>
    `;
    for (const item of response.data.Answer) {
      if (typeof item === 'string') {
        htmlContent += `<li>${item}</li>`;
      } else if (typeof item === 'object') {
        for (const [key, value] of Object.entries(item)) {
          htmlContent += `<li><strong>${key}:</strong> ${value}</li>`;
        }
      }
    }
    htmlContent += `</ul>`;
    
    if (response.data.Sources) {
      htmlContent += `
        <h3>Sources:</h3>
        <ul>
      `;
      for (const source of response.data.Sources) {
        htmlContent += `<li>${source}</li>`;
      }
      htmlContent += `</ul>`;
    }
  }

  htmlContent += `
    </body>
    </html>
  `;


  return c.html(htmlContent);
});

export default app;
