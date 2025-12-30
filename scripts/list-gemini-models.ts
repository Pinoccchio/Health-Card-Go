/**
 * List Available Gemini Models
 *
 * This script lists all models available for your Gemini API key.
 *
 * Usage:
 * npx tsx scripts/list-gemini-models.ts
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
  console.log('🔍 Listing Available Gemini Models\n');

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in .env.local');
    }

    console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

    const genAI = new GoogleGenerativeAI(apiKey);

    console.log('📡 Fetching models from Gemini API...\n');

    // List all available models
    const models = await genAI.listModels();

    console.log(`✅ Found ${models.length} available models:\n`);

    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Description: ${model.description || 'N/A'}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log('');
    });

    console.log('\n💡 Recommendation:');
    const flashModels = models.filter(m => m.name.toLowerCase().includes('flash'));
    if (flashModels.length > 0) {
      console.log(`   Use: "${flashModels[0].name}" (fastest and most cost-effective)`);
    } else {
      console.log(`   Use: "${models[0]?.name || 'N/A'}"`);
    }

  } catch (error) {
    console.error('\n❌ Failed to list models:', error);
    process.exit(1);
  }
}

listModels();
