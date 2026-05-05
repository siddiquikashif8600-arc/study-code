#!/bin/bash
echo "==========================="
echo "   LAB PROGRAM MATCHER"
echo "==========================="
files=("" "Mergesort.java" "Quicksort.java" "PrimGreedy.java" "Dijkstras.java" "Knapsack.java" "WarshallAlgorithm.java" "Tsp.java" "NQueens.java")
for i in {1..8}; do
    echo "  $i) ${files[$i]}"
done
echo "==========================="
read -p "Enter number (1-8): " choice

if [[ "$choice" =~ ^[1-8]$ ]]; then
    echo "Downloading ${files[$choice]}..."
    curl -sL "https://raw.githubusercontent.com/siddiquikashif8600-arc/study-code/main/gateway/p$choice.txt?v=2" -o "src/${files[$choice]}"
    echo "✅ Success! File saved inside src/${files[$choice]}"
else
    echo "❌ Invalid choice."
fi
