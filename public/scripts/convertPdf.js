document.addEventListener("DOMContentLoaded", function () {
    console.log("PDF Name:", window.pdfName);

    const fileName = window.pdfName;
    const pdfPath = `/pdfs/${fileName}`;

    console.log(`Loading PDF from: ${pdfPath}`);

    let isFirstMessage = true;
    let extractedTextByPage = {};

    const pdfContainer = document.getElementById("pdf-container");
    const chatIcon = document.getElementById("chat-icon");
    const chatContainer = document.getElementById("chat-container");
    const chatSubmit = document.getElementById("chat-submit");

    pdfContainer.style.display = "block";
    chatIcon.style.display = "block";

    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js";

        pdfjsLib.getDocument({ url: pdfPath }).promise.then((pdf) => {
            const renderPage = (pageNum) => {
                pdf.getPage(pageNum).then((page) => {
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    page.render({
                        canvasContext: context,
                        viewport: viewport,
                    }).promise.then(() => {
                        pdfContainer.appendChild(canvas);
                        if (pageNum < pdf.numPages) {
                            renderPage(pageNum + 1);
                        }
                    }).catch((error) => {
                        console.error(`Error rendering page ${pageNum}:`, error);
                    });

                    page.getTextContent().then((textContent) => {
                        let text = textContent.items.map(item => item.str).join(' ');
                        extractedTextByPage[pageNum] = text;
                    }).catch((error) => {
                        console.error(`Error extracting text from page ${pageNum}:`, error);
                    });
                }).catch((error) => {
                    console.error(`Error fetching page ${pageNum}:`, error);
                });
            };

            renderPage(1);
        }).catch((error) => {
            console.error("Error loading PDF:", error);
        });

        chatIcon.addEventListener("click", () => {
            chatContainer.classList.toggle("hidden");
            if (isFirstMessage) {
                initiateChat();
                isFirstMessage = false;
            }
        });

        chatSubmit.addEventListener("click", async () => {
            const userInput = document.getElementById("chat-textarea").value.trim();

            if (userInput !== "") {
                displayMessage(userInput, 'user-message');
                document.getElementById("chat-textarea").value = "";

                setTimeout(async () => {
                    try {
                        const matchedSection = searchForQuery(userInput, extractedTextByPage);
                        if (!matchedSection) {
                            const responseMessage = "No relevant content found. Please rephrase your question.";
                            displayMessage(responseMessage, 'response-message');
                            return;
                        }

                        const responseMessage = await generateResponse(userInput, matchedSection);
                        const formattedResponse = formatResponse(responseMessage);
                        displayMessage(formattedResponse, 'response-message');
                    } catch (error) {
                        displayMessage("Sorry, there was an error getting a response.", 'response-message');
                    }
                }, 1000);
            } else {
                alert("Please enter a message.");
            }
        });

        function displayMessage(message, className) {
            const chatMessages = document.getElementById("chat-messages");
            const messageElement = document.createElement("div");
            messageElement.classList.add("chat-message", className);
            messageElement.innerHTML = message;
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        async function generateResponse(message, matchedSection) {
            try {
                const response = await fetch('/generate-response', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ prompt: message, matchedSection })
                });
                if (!response.ok) {
                    console.error(`Error response: ${response.status} ${response.statusText}`);
                    throw new Error(`Server responded with ${response.status}`);
                }
                const data = await response.json();
                return data.reply;
            } catch (error) {
                console.error('Fetch error:', error);
                throw error;
            }
        }

        function initiateChat() {
            const initialMessages = [
                "Hi there! Need any help with the content on this page?",
                "Hello! How can I assist you with this page?",
                "Hey! Do you have any questions about what you're reading?",
                "Greetings! Is there something you'd like to know more about?",
                "Hi! Need any clarification on this topic?"
            ];
            const initialMessage = initialMessages[Math.floor(Math.random() * initialMessages.length)];
            displayMessage(initialMessage, 'response-message');
        }

        const stopWords = ["the", "is", "in", "at", "of", "and", "a", "to", "for", "on", "with", "as", "by"];

        function removeStopWords(query) {
            const words = query.split(' ');
            return words.filter(word => !stopWords.includes(word.toLowerCase())).join(' ');
        }

        

        function searchForQuery(query, textByPage) {
            const cleanQuery = removeStopWords(query);
            console.log("Searching for cleaned query:", cleanQuery);
        
            const queryLower = cleanQuery.toLowerCase();
            let bestMatch = '';
            let highestScore = 0;
            let bestPage = null;
        
            Object.keys(textByPage).forEach(pageNum => {
                const text = textByPage[pageNum];
                const sentences = text.split(/(?<=[.!?])\s+/);
        
                sentences.forEach(sentence => {
                    const sentenceLower = sentence.toLowerCase();
        
                    const words = queryLower.split(' ');
                    let score = 0;
        
                    words.forEach(word => {
                        const wordCount = (sentenceLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
                        score += wordCount;
                    });
        
                    // Adjust scoring logic here
                    score *= 1.5; // Scaling factor
        
                    // Apply more sophisticated text similarity measures here if needed
        
                    if (score > highestScore) {
                        highestScore = score;
                        bestMatch = sentence;
                        bestPage = pageNum;
                    }
                });
            });
        
            console.log("Best match:", bestMatch);
            console.log("Highest score:", highestScore);
            console.log("Best page:", bestPage);
        
            return highestScore > 0 ? { text: bestMatch, page: bestPage } : null;
        }
        
        function formatResponse(response) {
            let formatted = response.replace(/(\.|\?|!)([A-Za-z])/g, '$1 $2');
            formatted = formatted.split(/(?<=[.!?])\s+/).map(sentence => {
                sentence = sentence.trim();
                let words = sentence.split(' ');
                let firstFewWords = words.slice(0, 5).join(' ');

                if (/^[A-Z]/.test(sentence) && !/^.{0,25}:/.test(firstFewWords)) {
                    return `\n\n<p>${sentence}</p>\n\n`;
                }

                return `${sentence}. `;
            }).join('');

            return formatted.trim();
        }

    } else {
        console.error("pdfjsLib is not defined. PDF.js library may not be loaded correctly.");
    }
});
