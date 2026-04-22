import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface DecisionAnalysis {
  openingLine: string;
  collaborativeFraming: string;
  options: {
    title: string;
    pros: string[];
    cons: string[];
  }[];
  tradeOffs: string;
  insightLayer: string;
  interpretationLayer: string;
  reflectiveQuestion: string;
}

export interface ProblemAnalysis {
  openingLine: string;
  collaborativeFraming: string;
  rootCauses: string[];
  solutions: {
    title: string;
    pros: string[];
    cons: string[];
    difficulty: "Easy" | "Medium" | "Hard";
  }[];
  stepByStepPlan: string[];
  insightLayer: string;
  interpretationLayer: string;
  reflectiveQuestion: string;
}

export interface ThoughtAnalysis {
  openingLine: string;
  collaborativeFraming: string;
  analysis: string;
  outcomes: string[];
  risks: string[];
  longTermImpact: string;
  reflectionQuestions: string[];
  insightLayer: string;
  interpretationLayer: string;
  reflectiveQuestion: string;
  isHarmful: boolean;
  supportMessage?: string;
}

export const geminiService = {
  async analyzeThought(thought: string): Promise<ThoughtAnalysis> {
    const prompt = `
      Thought: "${thought}"
      
      You are a thinking companion—human, calm, thoughtful, and supportive.
      
      RESPONSE EXPERIENCE MODEL (FOLLOW STRICTLY):
      1. Human Opening (Hook): Start with a natural, emotionally aware sentence. Acknowledge the user's tone (confusion, stress, or curiosity).
      2. Collaborative Framing: Make it feel like thinking together (e.g., "Let's explore this together").
      3. Insight Before Structure: A short human insight about the core theme or trade-off BEFORE the analysis.
      4. Structured Analysis: Breakdown with natural language. 
         - Outcomes: 3 points.
         - Risks: 3 points.
         - Analysis: Deep but gentle.
      5. Interpretation Layer: A summary of what this exploration means in a human, reflective way.
      6. Reflective Question (MANDATORY): End with a thoughtful conversational question.

      SAFETY RULES:
      If harmful/dangerous (self-harm, risky actions):
      - DO NOT use harsh warnings.
      - Use: "I'd strongly advise against acting on this. It could lead to serious harm. Let's understand what's behind this thought."
      - Explain risks factually and calmly.
      - set isHarmful: true.

      Tone: 40% structure, 60% natural conversation. Simple English, avoid jargon.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            openingLine: { type: Type.STRING },
            collaborativeFraming: { type: Type.STRING },
            analysis: { type: Type.STRING },
            outcomes: { type: Type.ARRAY, items: { type: Type.STRING } },
            risks: { type: Type.ARRAY, items: { type: Type.STRING } },
            longTermImpact: { type: Type.STRING },
            reflectionQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            insightLayer: { type: Type.STRING },
            interpretationLayer: { type: Type.STRING },
            reflectiveQuestion: { type: Type.STRING },
            isHarmful: { type: Type.BOOLEAN },
            supportMessage: { type: Type.STRING },
          },
          required: ["openingLine", "collaborativeFraming", "analysis", "outcomes", "risks", "longTermImpact", "reflectionQuestions", "insightLayer", "interpretationLayer", "reflectiveQuestion", "isHarmful"],
        },
      },
    });

    try {
      if (!response.text) throw new Error("Empty response from AI");
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse Thought AI response:", e);
      console.error("Response text:", response.text);
      throw new Error("I couldn't quite finish my thoughts on that one. Could you try asking again?");
    }
  },

  async analyzeDecision(question: string, providedOptions?: string[]): Promise<DecisionAnalysis> {
    const prompt = `
      Decision: "${question}"
      Options: ${providedOptions?.length ? providedOptions.join(", ") : "None provided"}
      
      You are a thinking companion—human, calm, and supportive.
      
      RESPONSE EXPERIENCE MODEL (FOLLOW STRICTLY):
      1. Human Opening (Hook): Start with a natural, emotionally aware sentence. Acknowledge user's tone.
      2. Collaborative Framing: (e.g., "Let’s look at both sides together").
      3. Insight Before Structure: A short human insight about the nature of the choice.
      4. Structured Analysis (Options): For each option, provide title, 2 pros, 2 cons. Use short explanations, not just bullet words.
      5. Interpretation Layer: A summary of the trade-offs in a reflective way.
      6. Reflective Question (MANDATORY): End with a thoughtful conversational closing question.

      Tone: 40% structure, 60% natural conversation. Simple English, avoid jargon.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            openingLine: { type: Type.STRING },
            collaborativeFraming: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["title", "pros", "cons"],
              },
            },
            tradeOffs: { type: Type.STRING },
            insightLayer: { type: Type.STRING },
            interpretationLayer: { type: Type.STRING },
            reflectiveQuestion: { type: Type.STRING },
          },
          required: ["openingLine", "collaborativeFraming", "options", "tradeOffs", "insightLayer", "interpretationLayer", "reflectiveQuestion"],
        },
      },
    });

    try {
      if (!response.text) throw new Error("Empty response from AI");
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse Decision AI response:", e);
      console.error("Response text:", response.text);
      throw new Error("I had a bit of trouble analyzing those options. Let's try once more.");
    }
  },

  async analyzeProblem(description: string): Promise<ProblemAnalysis> {
    const prompt = `
      Problem: "${description}"
      
      You are a thinking companion—human, calm, and guidance-focused.
      
      RESPONSE EXPERIENCE MODEL (FOLLOW STRICTLY):
      1. Human Opening (Hook): Start with a natural, emotionally aware sentence. Acknowledge user's tone.
      2. Collaborative Framing: (e.g., "Let’s break this down together").
      3. Insight Before Structure: A short human insight about why this specific problem is challenging.
      4. Structured Analysis: 
         - Root Causes: 2 points.
         - Solutions: 2 options (Pros, Cons, Difficulty).
         - Step-by-Step Plan: 3 gentle steps.
      5. Interpretation Layer: A summary of the path forward in a human way.
      6. Reflective Question (MANDATORY): End with a thoughtful conversational question.

      Tone: 40% structure, 60% natural conversation. Simple English, avoid jargon.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            openingLine: { type: Type.STRING },
            collaborativeFraming: { type: Type.STRING },
            rootCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
            solutions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
                },
                required: ["title", "pros", "cons", "difficulty"],
              },
            },
            stepByStepPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
            insightLayer: { type: Type.STRING },
            interpretationLayer: { type: Type.STRING },
            reflectiveQuestion: { type: Type.STRING },
          },
          required: ["openingLine", "collaborativeFraming", "rootCauses", "solutions", "stepByStepPlan", "insightLayer", "interpretationLayer", "reflectiveQuestion"],
        },
      },
    });

    try {
      if (!response.text) throw new Error("Empty response from AI");
      return JSON.parse(response.text);
    } catch (e) {
      console.error("Failed to parse Problem AI response:", e);
      console.error("Response text:", response.text);
      throw new Error("I hit a small snag breaking this down for you. Could you rephrase or try again?");
    }
  },

  async clarifyInput(input: string): Promise<string> {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rewrite the following user input to be clearer and more structured while maintaining the original intent: "${input}"`,
      config: { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
    });
    return response.text || input;
  },
};
