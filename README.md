# Dehla Pakad - Multiplayer Card Game

A real-time multiplayer implementation of the traditional Dehla Pakad card game built with Next.js, TypeScript, and Tailwind CSS.

## Game Overview

Dehla Pakad is a popular 4-player card game where players sit around a virtual table and compete to win tricks. Each player receives 13 cards from a standard 52-card deck and takes turns playing cards to win tricks.

## Features

- **Room System**: Create and join game rooms with unique IDs
- **2x2 Table Layout**: Visual representation of 4 players sitting around a table
- **Seat Selection**: Players can choose any available seat (1-4)
- **Real-time Synchronization**: Built with Socket.IO for multiplayer gameplay
- **Card Dealing**: Automatic distribution of 13 cards to each player
- **Turn-based Gameplay**: Organized trick-taking mechanics
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone [repository-url]
   cd dehla-pakad
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home page with room listing
│   ├── room/[roomId]/
│   │   └── page.tsx          # Individual room page
│   └── layout.tsx            # App layout
├── components/
│   ├── Card.tsx              # Card component
│   └── GameTable.tsx         # Game table component
├── types/
│   └── game.ts               # TypeScript interfaces
└── utils/
    └── gameUtils.ts          # Game logic utilities
```

## Game Rules

1. **Setup**: 4 players join a room and select seats
2. **Dealing**: Each player receives 13 cards from a 52-card deck
3. **Playing**: Players take turns playing cards to win tricks
4. **Winning**: The player/team with the most tricks wins the game

## Technologies Used

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type safety and better development experience
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Socket.IO**: Real-time bidirectional communication
- **React Hooks**: Modern React state management

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Future Enhancements

- [ ] Complete Socket.IO integration
- [ ] Add game scoring system
- [ ] Implement advanced game rules
- [ ] Add player authentication
- [ ] Include game history and statistics
- [ ] Add spectator mode
- [ ] Implement reconnection handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
