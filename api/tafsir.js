import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { surahName, globalId, ayahNum } = req.query;

  if (!surahName || !globalId || !ayahNum) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const diyanetUrl = `https://kuran.diyanet.gov.tr/tefsir/${surahName}-suresi/${globalId}/${ayahNum}-ayet-tefsiri`;

  try {
    const response = await fetch(diyanetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch from Diyanet: ${response.status}`);
    }

    const htmlText = await response.text();
    const $ = cheerio.load(htmlText);
    const tefsirDiv = $('.tefsir-text');

    if (tefsirDiv.length > 0) {
      // Send the HTML content
      res.status(200).json({ html: tefsirDiv.html() });
    } else {
      res.status(404).json({ error: 'Tefsir text not found on Diyanet site' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch tafsir' });
  }
}
