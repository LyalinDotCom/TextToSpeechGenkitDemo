# Genkit Text-to-Speech with Gemini Models

This project serves as a developer's guide and example implementation for leveraging Genkit with Google's Gemini text-to-speech models. It demonstrates how to generate high-quality, synthesized audio from text, supporting both single-speaker and multi-speaker use cases. The generated audio is provided in the WAV format.

This README will guide you through setting up the project, understanding its key components, and exploring the code examples for generating speech.

## Prerequisites

Before you begin, ensure you have the following installed and configured:

*   **Node.js:** Version 18 or later is recommended. You can download it from [nodejs.org](https://nodejs.org/).
*   **npm or yarn:** These package managers come with Node.js (npm) or can be installed separately (yarn). This project uses npm in its examples (`npm install`, `npm run ...`).
*   **Google Cloud Project:** You will need a Google Cloud project with billing enabled.
*   **Vertex AI API Enabled:** Ensure the Vertex AI API is enabled in your Google Cloud project. You can enable APIs by navigating to the "APIs & Services" > "Library" section in the Google Cloud Console and searching for "Vertex AI API".

## Setup Instructions

Follow these steps to get the project running locally:

1.  **Clone the Repository:**
    If you haven't already, clone this repository to your local machine.
    ```bash
    # Replace the URL with the actual URL of this repository
    git clone https://github.com/your-username/your-repository-name.git
    cd your-repository-name
    ```
    *(Note: If you are using this project as a template, update the repository URL above to your own).*

2.  **Install Dependencies:**
    Use npm (or yarn if you prefer) to install the project dependencies:
    ```bash
    npm install
    ```

3.  **Configure Google Cloud Authentication (API Key):**
    Genkit, using the `@genkit-ai/googleai` plugin, requires authentication to use Google Cloud services like the Gemini API for text-to-speech.

    *   **Recommended: Using an API Key via a `.env` file:**
        This project is configured to use the `dotenv` package, which loads environment variables from a `.env` file in the project root. The `src/ai/dev.ts` file (the entry point for Genkit development) already includes `import { config } from 'dotenv'; config();` to load this file.

        a.  **Create a `.env` file:** In the root directory of the project, create a file named `.env`.

        b.  **Add your API Key:** Add your Google Cloud API key to the `.env` file like this:
            ```env
            GOOGLE_API_KEY="your_actual_google_api_key_here"
            ```
            Replace `"your_actual_google_api_key_here"` with your actual API key.
            *Important Security Note:* Ensure your API key is kept confidential. The `.env` file is included in the project's `.gitignore` to prevent accidental commits of sensitive information.

    *   **Alternative: Using Application Default Credentials (ADC):**
        If you prefer, and have the Google Cloud CLI (`gcloud`) installed and configured, you can set up ADC by running:
        ```bash
        gcloud auth application-default login
        ```
        Genkit can automatically pick up these credentials if no `GOOGLE_API_KEY` is found in the environment.

    *Note on API Key Permissions:* Ensure the API key or the principal account for ADC has the necessary permissions to access the Vertex AI API (specifically the "Vertex AI User" role or equivalent permissions for text-to-speech models).

## Running the Project

This project has two main parts: the Genkit AI flows and a Next.js frontend.

**1. Running Genkit Flows:**
The core text-to-speech logic is implemented as Genkit flows. To start the Genkit development server and make these flows available (e.g., for testing via the Genkit Developer UI or for the frontend to call):

*   Run with automatic reloading on changes:
    ```bash
    npm run genkit:watch
    ```
*   Or run without watching for changes:
    ```bash
    npm run genkit:dev
    ```

Once started, Genkit typically provides a local URL (e.g., `http://localhost:4000`) where you can access the Genkit Developer UI to inspect and test your flows. These npm scripts invoke `tsx src/ai/dev.ts` (as seen in `package.json`) to start the Genkit environment.

**2. Running the Next.js Frontend (Optional):**
This project also includes a Next.js frontend, likely for demonstrating or interacting with the Genkit flows. To run the frontend development server:
```bash
npm run dev
```
This will typically start the frontend on `http://localhost:9002` (as per the `dev` script in `package.json`). The frontend would then make requests to the Genkit flows.

For the purpose of understanding the Genkit text-to-speech integration, focusing on running the Genkit flows (Step 1) is key.

## Code Examples and Key Files

Here's where to find the core logic and examples within the project:

*   **`src/ai/flows/text-to-speech.ts`**: This is the heart of the text-to-speech functionality.
    *   **Single-Speaker Audio:**
        *   The `textToSpeech(input: TextToSpeechInput)` function (which internally calls `textToSpeechFlow`) handles generating audio for a single voice.
        *   **Input (`TextToSpeechInput`):**
            *   `text: string`: The text to convert to speech.
            *   `voiceName: string (optional)`: The specific voice to use (e.g., "Algenib"). Defaults to a pre-defined voice if not provided.
    *   **Multi-Speaker Audio:**
        *   The `multiSpeakerTextToSpeech(input: MultiSpeakerTextToSpeechInput)` function (which internally calls `multiSpeakerTextToSpeechFlow`) handles generating audio with distinct voices for different parts of the text.
        *   **Input (`MultiSpeakerTextToSpeechInput`):**
            *   `text: string`: The text to convert, formatted with speaker tags. **Crucially, the text must use `<speaker="Speaker1">...</speaker>` and `<speaker="Speaker2">...</speaker>` tags** to delineate segments for different speakers. For example: `<speaker="Speaker1">Hello, this is the first speaker.</speaker> <speaker="Speaker2">And this is the second speaker.</speaker>`
            *   `voiceName1: string`: The voice name for "Speaker1".
            *   `voiceName2: string`: The voice name for "Speaker2".
    *   **Output (for both functions - `TextToSpeechOutput`):**
        *   `audioDataUri: string`: A base64 encoded data URI for the generated WAV audio.

*   **`src/ai/genkit.ts`**: This file initializes Genkit and configures the Google AI plugin (`@genkit-ai/googleai`). You can see how the `gemini-2.0-flash` model is set as a default (though the TTS flows specify the TTS-specific model like `gemini-2.5-flash-preview-tts`).

*   **`src/ai/dev.ts`**: This file is the entry point for running Genkit in development mode (used by `npm run genkit:dev` and `npm run genkit:watch`). It imports `dotenv` to load environment variables and also imports the flow files (like `text-to-speech.ts`) to make them available to the Genkit framework.

*   **`src/app/page.tsx`**: This is the main page for the Next.js frontend application. If you run the frontend, this is where UI elements would likely interact with the Genkit text-to-speech flows.

By examining these files, particularly `text-to-speech.ts`, developers can understand how to implement and customize text-to-speech generation using Genkit and Gemini models.

## Understanding the Audio Generation Process

The core of the audio generation relies on the following:

*   **Gemini TTS Model:** The flows in `src/ai/flows/text-to-speech.ts` utilize one of Google's advanced text-to-speech models, specifically `gemini-2.5-flash-preview-tts` (as of the last review of the code), via the Genkit `ai.generate()` call. This model is responsible for converting the input text into audio data.
*   **Audio Format (PCM to WAV):**
    *   The Gemini TTS model initially returns audio data in PCM (Pulse Code Modulation) format, typically as a base64 encoded string within a data URI.
    *   The project includes utility functions (e.g., `pcmToWavDataUri` in `text-to-speech.ts`) that convert this raw PCM data into the more common and web-friendly WAV audio format. This involves creating a WAV file structure, including headers, around the PCM data.
    *   The final output provided by the flows is a data URI representing this WAV audio.

This two-step process (generation by Gemini, then conversion to WAV) ensures that the application delivers audio in a widely usable format.

## Further Exploration

*   **Experiment with Voices:** Explore different voice names available for the Gemini TTS models.
*   **Error Handling:** Enhance the error handling within the flows for more robust application behavior.
*   **Frontend Integration:** Expand the Next.js frontend (`src/app/page.tsx`) to create a more interactive experience with the text-to-speech capabilities.
*   **Other Genkit Features:** Explore other features of Genkit for building more complex AI flows.
