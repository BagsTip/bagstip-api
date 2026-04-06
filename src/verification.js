const axios = require('axios');

async function checkCodeInTweet(tweetId, expectedHandle, verificationCode) {
  try {
    const bearer = process.env.X_BEARER_TOKEN;
    if (!bearer) {
      console.warn("⚠️  X_BEARER_TOKEN is missing. This will fail.");
    }
    
    const response = await axios.get(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=author_id,text&expansions=author_id&user.fields=username`,
      {
        headers: {
          Authorization: `Bearer ${bearer}`
        }
      }
    );

    const data = response.data;
    
    if (!data || !data.data) {
      return { verified: false, error: "Tweet not found or API error" };
    }

    const text = data.data.text;
    const authorId = data.data.author_id;
    
    // Find the author username from includes
    const user = data.includes.users.find(u => u.id === authorId);
    
    if (!user) {
       return { verified: false, error: "Could not fetch author information" };
    }

    if (user.username.toLowerCase() !== expectedHandle.toLowerCase()) {
      return { verified: false, error: "Tweet author does not match the provided X handle" };
    }

    if (!text.includes(verificationCode)) {
      return { verified: false, error: "Tweet does not contain the verification code" };
    }

    return { verified: true };
  } catch (error) {
    let msg = error.message;
    if (error.response && error.response.data) {
      msg = JSON.stringify(error.response.data);
    }
    return { verified: false, error: `X API error: ${msg}` };
  }
}

// Utility to extract ID from tweet URL
function extractTweetId(url) {
  const match = url.match(/(?:status|statuses)\/(\d+)/);
  return match ? match[1] : null;
}

module.exports = {
  checkCodeInTweet,
  extractTweetId
};
