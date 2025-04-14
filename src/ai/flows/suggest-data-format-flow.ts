'use server';
/**
 * @fileOverview A plant problem diagnosis AI agent.
 *
 * - diagnosePlant - A function that handles the plant diagnosis process.
 * - DiagnosePlantInput - The input type for the diagnosePlant function.
 * - DiagnosePlantOutput - The return type for the diagnosePlant function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SuggestDataFormatInputSchema = z.object({
  csvData: z.string().describe('The CSV data to format.'),
  targetColumns: z.string().describe('The target columns for the data.'),
  presentColumns: z.string().describe('The present columns in the data.'),
});
export type SuggestDataFormatInput = z.infer<typeof SuggestDataFormatInputSchema>;

const SuggestDataFormatOutputSchema = z.object({
  columnMappings: z.record(z.string(), z.string()).describe('The suggested column mappings.'),
});
export type SuggestDataFormatOutput = z.infer<typeof SuggestDataFormatOutputSchema>;

export async function suggestDataFormat(input: SuggestDataFormatInput): Promise<SuggestDataFormatOutput> {
  return suggestDataFormatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDataFormatPrompt',
  input: {
    schema: z.object({
      csvData: z.string().describe('The CSV data to format.'),
      targetColumns: z.string().describe('The target columns for the data.'),
       presentColumns: z.string().describe('The present columns in the data.'),
    }),
  },
  output: {
    schema: z.object({
      columnMappings: z.record(z.string(), z.string()).describe('The suggested column mappings.'),
    }),
  },
  prompt: `
You are an expert data formatting assistant. Suggest column mappings to transform the data into a structured format.

Consider these target columns:
{{{targetColumns}}}

Only suggest mappings for these present columns:
{{{presentColumns}}}

Suggest the best column mappings based on the target columns.

Output the column mappings in JSON format.

Here's an example of the desired JSON format:
{
  "columnMappings": {"Nome": "Nome", "Sobrenome": "Sobrenome", "Email": "Email"}
}

Follow this JSON format for your response:

{
  "columnMappings": {
    "originalColumn1": "targetColumn1",
    "originalColumn2": "targetColumn2",
    ...
  }
}

Here's the CSV data:
{{{csvData}}}
`,
});

const suggestDataFormatFlow = ai.defineFlow<
  typeof SuggestDataFormatInputSchema,
  typeof SuggestDataFormatOutputSchema
>(
  {
    name: 'suggestDataFormatFlow',
    inputSchema: SuggestDataFormatInputSchema,
    outputSchema: SuggestDataFormatOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      // Ensure that columnMappings is always present, even if empty.
      console.log('LLM Output:', output);
      const columnMappings = output?.columnMappings || {};
      return {
        columnMappings: columnMappings,
      };
    } catch (error) {
      console.error('Error in suggestDataFormatFlow:', error);
      return {
        columnMappings: {},
      };
    }
   
   
   
  }
);
