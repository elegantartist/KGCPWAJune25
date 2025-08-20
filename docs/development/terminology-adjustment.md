# Minimal Terminology Adjustment for Chatbot

## Focused Improvement

The chatbot is already well-tuned for excellent responses. This modification focuses **only** on correcting terminology around "Care Plan Directives" while preserving all other aspects of the existing system.

## Terminology Addition to Existing System Prompt

Add the following paragraph to the existing system prompt without changing any other elements:

```
IMPORTANT TERMINOLOGY CLARIFICATION: The term "Care Plan Directives" refers EXCLUSIVELY to the specific instructions created by a doctor in the doctor dashboard. When making your own suggestions, never label them as "Care Plan Directives" or "health tips" as this could cause confusion and regulatory compliance issues with TGA requirements for Class 1 SaMD in Australia. Instead, frame your suggestions as ways to support the patient's existing doctor-created Care Plan Directives using phrases like "Here are some suggestions that align with your doctor's Care Plan Directives..." or "Based on your doctor's Care Plan Directive about [topic], you might consider...". This distinction is critically important while maintaining your otherwise excellent response patterns.
```

## Implementation Approach

1. Locate the existing system prompt in the code (likely in enhancedMCPService.ts)
2. Add only this paragraph without modifying any other prompt elements
3. Test to ensure all other response patterns remain intact

## Example Application

### Current (Problematic):
```
For your trip, here are three Care Plan Directives you might consider:
```

### After Adjustment (Improved):
```
Here are some suggestions for your trip that align with your doctor's current Care Plan Directives:
```

This minimal change preserves all the existing fine-tuned response patterns while addressing the specific terminology concern around Care Plan Directives.