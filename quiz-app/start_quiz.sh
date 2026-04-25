#!/bin/bash
# Quiz App – Starter-Skript für macOS und Linux
# Doppelklick (oder Terminal: bash start_quiz.sh)

cd "$(dirname "$0")"

echo ""
echo "  ===================================="
echo "   Quiz App  –  Lokaler Start"
echo "  ===================================="
echo ""

# Python ermitteln
PYTHON=""
if command -v python3 &>/dev/null; then
    PYTHON=python3
elif command -v python &>/dev/null; then
    PYTHON=python
fi

if [ -z "$PYTHON" ]; then
    echo "  Python nicht gefunden."
    echo "  Starte Quiz direkt im Browser..."
    echo ""
    xdg-open "$(pwd)/index.html" 2>/dev/null \
        || open "$(pwd)/index.html" 2>/dev/null \
        || echo "  Bitte index.html manuell öffnen."
    exit 0
fi

# Lokalen Server starten
echo "  Starte Server auf http://localhost:8080"
echo "  Strg+C zum Beenden."
echo ""

$PYTHON -m http.server 8080 &
SERVER_PID=$!

sleep 1

# Browser öffnen (Linux / macOS)
xdg-open http://localhost:8080 2>/dev/null \
    || open http://localhost:8080 2>/dev/null

# Warten bis Strg+C
wait $SERVER_PID
