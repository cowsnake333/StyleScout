# Style Scout

**Finds clothes near you based on a photo.**

Style Scout is an AI-powered application that helps you identify clothing items from photos and find similar items in local stores near you.

## Features

- **Visual Analysis**: Upload a photo of clothing to get a detailed analysis of the style, fabric, and potential brands.
- **Styling Advice**: Receive professional styling tips on how to wear and pair the item.
- **Local Store Finder**: Discover physical stores nearby that are likely to carry similar items.
- **Online Links**: Get direct links to official brand websites.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **AI**: Google Gemini API (Multimodal analysis with `gemini-2.5-flash`)
- **APIs**: Google Maps (via Gemini grounding), Google Search (via Gemini grounding)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Google Cloud Project with the Gemini API enabled
- An API Key for the Gemini API

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/style-scout.git
    cd style-scout
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Set up environment variables:
    - Create a `.env` file in the root directory.
    - Add your Gemini API key:
      ```env
      GEMINI_API_KEY=your_api_key_here
      ```

4.  Run the development server:
    ```bash
    npm run dev
    ```

5.  Open your browser and navigate to `http://localhost:3000`.

## Usage

1.  Allow location access when prompted (required to find nearby stores).
2.  Click the upload area to select a photo of a clothing item, or drag and drop an image.
3.  Click "Scout Locations" to start the analysis.
4.  View the results, including the clothing analysis, styling tips, and a list of nearby stores.

## License

This project is open source and available under the [MIT License](LICENSE).
