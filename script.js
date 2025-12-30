class NLPTermsExtractor {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.hideDownloadButton();
    }

    initializeElements() {
        this.uploadArea = document.getElementById("uploadArea");
        this.fileInput = document.getElementById("fileInput");
        this.resultsSection = document.getElementById("resultsSection");
        this.resultsGrid = document.getElementById("resultsGrid");
        this.emptyState = document.getElementById("emptyState");
        this.loadingOverlay = document.getElementById("loadingOverlay");
        this.toastContainer = document.getElementById("toastContainer");
    }

    bindEvents() {
        // File input change
        this.fileInput.addEventListener("change", (e) => this.handleFileSelect(e));

        // Upload area click (ignore if clicking on zipNameInput or downloadAllBtn)
        this.uploadArea.addEventListener("click", (e) => {
            // Prevent file dialog if clicking on the ZIP name input or Download All button
            if (e.target.id === "zipNameInput" || e.target.id === "downloadAllBtn")
                return;
            this.fileInput.click();
        });

        // Drag and drop events
        this.uploadArea.addEventListener("dragover", (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener("dragleave", (e) =>
            this.handleDragLeave(e)
        );
        this.uploadArea.addEventListener("drop", (e) => this.handleDrop(e));

        // Prevent default drag behaviors
        ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
            document.body.addEventListener(eventName, (e) => e.preventDefault());
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add("dragover");
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove("dragover");
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove("dragover");
        const files = Array.from(e.dataTransfer.files).filter(
            (file) => file.type === "text/plain"
        );
        if (files.length > 0) {
            this.processFiles(files);
        }
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            this.processFiles(files);
        }
    }

    async processFiles(files) {
        this.showLoading(true);
        this.hideEmptyState();

        try {
            const results = [];

            for (const file of files) {
                try {
                    const content = await this.readFileContent(file);
                    const terms = this.extractTerms(content);
                    results.push({
                        filename: file.name,
                        terms: terms.terms,
                        termCount: terms.count,
                        content: content,
                    });
                } catch (error) {
                    console.error(`Error processing ${file.name}:`, error);
                    results.push({
                        filename: file.name,
                        error: true,
                        errorMessage: error.message,
                    });
                }
            }

            this.displayResults(results);
        } catch (error) {
            console.error("Error processing files:", error);
        } finally {
            this.showLoading(false);
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsText(file);
        });
    }

    extractTerms(text) {
        // Same regex pattern as the Python version
        const section = text.match(/## IMPORTANT TERMS TO USE(.+?)(##|$)/is);
        if (!section) {
            return { terms: "IMPORTANT TERMS section not found.", count: 0 };
        }

        const content = section[1];
        const terms = content.match(/\*\s*(.+?):/g);

        if (!terms) {
            return {
                terms: "No terms found in the IMPORTANT TERMS section.",
                count: 0,
            };
        }

        const cleanedTerms = [
            ...new Set(
                terms.map((term) =>
                    term
                        .replace(/^\*\s*/, "")
                        .replace(/:$/, "")
                        .trim()
                )
            ),
        ];
        const sortedTerms = cleanedTerms.sort();

        return {
            terms: sortedTerms.join("\n"),
            count: sortedTerms.length,
        };
    }

    displayResults(results) {
        this.resultsGrid.innerHTML = "";

        results.forEach((result, index) => {
            const card = this.createResultCard(result, index);
            this.resultsGrid.appendChild(card);
        });

        this.resultsSection.classList.remove("hidden");
        this.emptyState.classList.add("hidden");
        this.showDownloadButton();
    }

    createResultCard(result, index) {
        const card = document.createElement("div");
        card.className =
            "bg-white rounded-2xl shadow-lg p-6 card-hover animate-slide-up";
        card.style.animationDelay = `${index * 100}ms`;

        if (result.error) {
            card.innerHTML = this.createErrorCard(result);
        } else {
            card.innerHTML = this.createSuccessCard(result);
        }

        return card;
    }

    createSuccessCard(result) {
        // Clean the filename for display
        const cleanDisplayName = this.cleanFilename(result.filename);

        return `
    <div class="flex items-start space-x-3 mb-4">
        <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-gray-800 text-sm font-Inter" style="font-family: 'Inter', sans-serif;">
                ${this.escapeHtml(cleanDisplayName)}
            </h3>
        </div>
    </div>
    
    <div class="bg-gray-50 rounded-xl p-3 mb-4 h-32 overflow-y-auto">
        <pre class="text-xs text-gray-700 font-mono whitespace-pre-wrap">${result.terms
            }</pre>
    </div>
    
    <div class="flex items-center justify-between">
        <span
            class="text-white text-xs font-semibold px-4 py-2 rounded-full shadow-md"
            style="
                font-family: 'Inter', sans-serif;
                background: linear-gradient(90deg, #008278 0%, #3bc522 100%);
            ">
            ${result.termCount} Keyword${result.termCount !== 1 ? "s" : ""}
        </span>
        
        <button class="copy-btn bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all duration-300 shadow-md" 
                data-terms="${this.escapeHtml(result.terms)}"
                style="font-family: 'Inter', sans-serif;">
            Copy Terms
        </button>
    </div>
`;
    }

    createErrorCard(result) {
        // Clean the filename for display
        const cleanDisplayName = this.cleanFilename(result.filename);

        return `
            <div class="flex items-start space-x-3 mb-4">
                <div class="text-2xl">❌</div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-red-800 text-sm truncate" title="${cleanDisplayName}">
                        ${this.escapeHtml(cleanDisplayName)}
                    </h3>
                </div>
            </div>
            
            <div class="bg-red-50 rounded-xl p-3 border border-red-200">
                <p class="text-red-700 text-xs">
                    Failed to read file: ${result.errorMessage}
                </p>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    hideEmptyState() {
        this.emptyState.classList.add("hidden");
    }

    hideDownloadButton() {
        const downloadBtn = document.getElementById("downloadAllBtn");
        if (downloadBtn) {
            downloadBtn.classList.add("hidden");
        }
    }

    showLoading(show) {
        this.loadingOverlay.classList.toggle("hidden", !show);
    }

    // Copy functionality
    setupCopyButtons() {
        document.addEventListener("click", (e) => {
            // Prevent file dialog if clicking on the ZIP name input
            if (e.target.id === "zipNameInput") {
                e.stopPropagation();
                return;
            }
            if (e.target.classList.contains("copy-btn")) {
                this.copyTermsToClipboard(e.target);
            }
            // Download all functionality
            if (e.target.id === "downloadAllBtn") {
                e.stopPropagation(); // Prevent triggering file dialog
                this.downloadAllTerms();
            }
        });
    }

    async copyTermsToClipboard(button) {
        const terms = button.getAttribute("data-terms");

        try {
            await navigator.clipboard.writeText(terms);

            // Update button appearance
            button.innerHTML = "Copied!";
            button.classList.remove("bg-gray-900", "hover:bg-gray-800");
            button.classList.add(
                "bg-gradient-to-r",
                "from-green-500",
                "to-green-600",
                "hover:from-green-600",
                "hover:to-green-700"
            );

            // Update title color to green
            const card = button.closest(".card-hover");
            const title = card.querySelector("h3");
            if (title) {
                title.classList.remove("text-gray-800");
                title.classList.add("text-green-600");
            }
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    }

    // Extract terms from text
    extractTerms(text) {
        // Same regex pattern as the Python version
        const section = text.match(/## IMPORTANT TERMS TO USE(.+?)(##|$)/is);
        if (!section) {
            return { terms: "IMPORTANT TERMS section not found.", count: 0 };
        }

        const content = section[1];
        const terms = content.match(/\*\s*(.+?):/g);

        if (!terms) {
            return {
                terms: "No terms found in the IMPORTANT TERMS section.",
                count: 0,
            };
        }

        let cleanedTerms = terms.map((term) =>
            term
                .replace(/^\*\s*/, "")
                .replace(/:$/, "")
                .trim()
        );

        // Always remove duplicates and sort alphabetically
        cleanedTerms = [...new Set(cleanedTerms)];
        cleanedTerms = cleanedTerms.sort();

        return {
            terms: cleanedTerms.join("\n"),
            count: cleanedTerms.length,
        };
    }

    // Clean filename by removing surfer-guidelines- prefix and date suffix
    cleanFilename(filename) {
        // Remove .txt extension
        let cleanName = filename.replace(/\.txt$/i, "");

        // Handle surfer-guidelines- pattern: number + dot + surfer-guidelines-
        cleanName = cleanName.replace(/^(\d+\.)\s*surfer-guidelines-/, "$1 ");

        // Handle underscore pattern: number + underscore (convert to number + dot + space)
        cleanName = cleanName.replace(/^(\d+)_/, "$1. ");

        // Replace dash after sequence number with dot and ensure single space
        cleanName = cleanName.replace(/^(\d+\.)\s*-\s*/, "$1. ");

        // Remove date pattern like -12-08-2025 or -12-8-2025
        cleanName = cleanName.replace(/-\d{1,2}-\d{1,2}-\d{4}$/, "");

        return cleanName;
    }

    // Show download button when results are available
    showDownloadButton() {
        const downloadBtn = document.getElementById("downloadAllBtn");
        if (downloadBtn) {
            downloadBtn.classList.remove("hidden");
        }
    }

    // Download all extracted terms as a ZIP file
    async downloadAllTerms() {
        const cards = document.querySelectorAll(".card-hover");
        if (cards.length === 0) {
            return;
        }

        try {
            // Check if JSZip is available
            if (typeof JSZip === "undefined") {
                return;
            }

            const zip = new JSZip();

            // Add each file to the ZIP
            cards.forEach((card, index) => {
                const title = card.querySelector("h3").textContent;
                const terms = card.querySelector("pre").textContent;

                // Create content with clean format
                const fileContent = `${title}\n${terms}`;

                // Use the clean title directly for the filename
                const cleanFilename = `${title
                    .replace(/_/g, " ")
                    .replace(/\s+/g, " ")
                    .trim()}.txt`;
                zip.file(cleanFilename, fileContent);
            });

            // Get ZIP name from input, fallback to default
            const zipNameInput = document.getElementById("zipNameInput");
            let zipFileName = "extracted_terms.zip";
            if (zipNameInput && zipNameInput.value.trim()) {
                zipFileName = zipNameInput.value.trim();
                if (!zipFileName.toLowerCase().endsWith(".zip")) {
                    zipFileName += ".zip";
                }
            }

            // Generate and download ZIP file
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = zipFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error creating ZIP:", error);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    const app = new NLPTermsExtractor();
    app.setupCopyButtons();
});

// Add some nice interactions
document.addEventListener("DOMContentLoaded", () => {
    // Add keyboard navigation
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && document.activeElement === uploadArea) {
            document.getElementById("fileInput").click();
        }
    });

    // Add focus styles for accessibility
    const uploadArea = document.getElementById("uploadArea");
    uploadArea.setAttribute("tabindex", "0");
    uploadArea.addEventListener("focus", () => {
        uploadArea.classList.add("ring-2", "ring-blue-500", "ring-opacity-50");
    });

    uploadArea.addEventListener("blur", () => {
        uploadArea.classList.remove("ring-2", "ring-blue-500", "ring-opacity-50");
    });
});
