<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Dehla Pakad Card Game - Copilot Instructions

This is a multiplayer Dehla Pakad card game built with Next.js, TypeScript, and Tailwind CSS.

## Project Structure

- Use Next.js App Router (app directory)
- TypeScript for type safety
- Tailwind CSS for styling
- Socket.IO for real-time multiplayer functionality

## Game Rules & Context

- Dehla Pakad is a 4-player card game
- Players sit in a 2x2 table arrangement
- Each player receives 13 cards from a standard 52-card deck
- Game involves trick-taking mechanics
- Real-time synchronization required for multiplayer

## Code Guidelines

- Use TypeScript interfaces for game state, player data, and card types
- Implement proper error handling for network operations
- Use React hooks for state management
- Follow responsive design principles with Tailwind
- Implement proper room management with unique IDs
- Use Socket.IO for real-time communication between players

## Key Features to Implement

- Room creation and joining system
- 2x2 table UI with seat selection
- Card dealing and hand management
- Turn-based gameplay logic
- Real-time synchronization between players
- Responsive design for various screen sizes
