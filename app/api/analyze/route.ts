import { NextRequest, NextResponse } from 'next/server';

interface AnalysisResponse {
  productName: string;
  ecoScore: number;
  metrics: {
    carbonFootprint: string;
    waterUsage: string;
    packaging: string;
  };
  alternatives: Array<{
    name: string;
    ecoScore: number;
    improvement: string;
  }>;
}

// Determine sustainability score based on product keywords
function calculateEcoScore(productName: string, brand?: string): number {
  const name = (productName + ' ' + (brand || '')).toLowerCase();
  
  // Positive factors (increase score)
  const positiveKeywords = [
    'organic', 'eco', 'sustainable', 'green', 'recycled', 'biodegradable',
    'natural', 'compostable', 'renewable', 'plastic-free', 'reusable',
    'fair trade', 'cruelty-free', 'hemp', 'bamboo', 'cotton'
  ];
  
  // Negative factors (decrease score)
  const negativeKeywords = [
    'plastic', 'synthetic', 'petroleum', 'microplastic', 'palm oil',
    'single-use', 'disposable', 'styrofoam', 'non-recyclable'
  ];
  
  let score = 50; // Base score
  
  positiveKeywords.forEach(keyword => {
    if (name.includes(keyword)) score += 8;
  });
  
  negativeKeywords.forEach(keyword => {
    if (name.includes(keyword)) score -= 10;
  });
  
  return Math.max(0, Math.min(100, score));
}

// Generate metrics based on product type
function getMetrics(productName: string) {
  const name = productName.toLowerCase();
  
  let carbonFootprint = 'Medium';
  let waterUsage = 'Medium';
  let packaging = 'Standard';
  
  if (name.includes('bottle') || name.includes('water')) {
    carbonFootprint = name.includes('reusable') ? 'Low' : 'Medium';
    waterUsage = 'Low';
    packaging = name.includes('plastic') ? 'Non-recyclable plastic' : 'Recyclable';
  } else if (name.includes('shirt') || name.includes('cloth') || name.includes('apparel')) {
    carbonFootprint = name.includes('organic') ? 'Medium' : 'High';
    waterUsage = name.includes('organic') ? 'Low' : 'High';
    packaging = 'Carton or paper';
  } else if (name.includes('food') || name.includes('egg') || name.includes('produce')) {
    carbonFootprint = name.includes('organic') ? 'Low' : 'Medium';
    waterUsage = name.includes('organic') ? 'Medium' : 'High';
    packaging = name.includes('plastic') ? 'Plastic' : 'Recyclable';
  }
  
  return { carbonFootprint, waterUsage, packaging };
}

// Generate better alternatives
function generateAlternatives(productName: string, currentScore: number) {
  const alternatives = [];
  
  if (currentScore < 70) {
    alternatives.push({
      name: `Sustainable ${productName}`,
      ecoScore: Math.min(currentScore + 25, 95),
      improvement: `${Math.min(currentScore + 25, 95) - currentScore}% better`
    });
    
    alternatives.push({
      name: `Organic/Eco ${productName}`,
      ecoScore: Math.min(currentScore + 20, 90),
      improvement: `${Math.min(currentScore + 20, 90) - currentScore}% better`
    });
  }
  
  return alternatives;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, brand } = body;
    
    if (!productName) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }
    
    const ecoScore = calculateEcoScore(productName, brand);
    const metrics = getMetrics(productName);
    const alternatives = generateAlternatives(productName, ecoScore);
    
    const response: AnalysisResponse = {
      productName,
      ecoScore,
      metrics,
      alternatives
    };
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to analyze sustainability' },
      { status: 500 }
    );
  }
}
