flowchart TD

    %% ============================================
    %% ESTILOS VISUAIS
    %% ============================================
    classDef client fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#000
    classDef livekit fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#000
    classDef backend fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#000
    classDef mcp fill:#ede7f6,stroke:#5e35b1,stroke-width:2px,color:#000
    classDef ai fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#000
    classDef db fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000

    %% ============================================
    %% CLIENT LAYER
    %% ============================================
    subgraph CLIENT ["📱 Flutter App"]
        direction LR
        UI["Chat UI <br/> Text Input"]:::client
        AUDIO["LiveKit Flutter SDK <br/> Voice & WebRTC"]:::client
    end

    %% ============================================
    %% LIVEKIT ORCHESTRATION LAYER
    %% ============================================
    subgraph ORCHESTRATION ["📡 Voice Orchestration"]
        LIVEKIT["LiveKit Cloud / Server <br/> WebRTC Audio Pipeline"]:::livekit
    end

    %% ============================================
    %% AGENT & MCP LAYER (Substitui NestJS/Next.js)
    %% ============================================
    subgraph AGENT_LAYER ["⚙️ Backend (TypeScript)"]
        AGENT["TS Agent Worker <br/> Logic & Integrations"]:::backend
        HISTORY["Conversation History"]:::backend
    end

    subgraph MCP_LAYER ["🛠️ Context & Tools"]
        MCPSERVER["MCP Server(s) <br/> APIs & Profile Fetching"]:::mcp
    end

    %% ============================================
    %% AI SERVICES
    %% ============================================
    subgraph AI_SERVICES ["🧠 AI Services"]
        WHISPER["Groq Whisper <br/> Audio to Text (STT)"]:::ai
        CLAUDE["Anthropic Claude <br/> Sonnet 4.5"]:::ai
        TTS["OpenAI TTS-1 <br/> Text to Audio (TTS)"]:::ai
    end

    %% ============================================
    %% DATA LAYER
    %% ============================================
    subgraph DATA ["🗄️ Database"]
        DB[("PostgreSQL <br/> Supabase")]:::db
    end

    %% ============================================
    %% VOICE FLOW (Orquestrado pelo LiveKit)
    %% ============================================
    AUDIO <-->|1. WebRTC Full Audio| LIVEKIT
    LIVEKIT -->|2. Route to STT| WHISPER
    WHISPER -->|3. Transcribed Text| LIVEKIT
    LIVEKIT -->|4. Pass Text to Agent| AGENT
    AGENT <-->|5. Stream tokens| CLAUDE
    AGENT -->|6. Agent Response| LIVEKIT
    LIVEKIT -->|7. Route to TTS| TTS
    TTS -->|8. Send Audio Stream| LIVEKIT

    %% ============================================
    %% TEXT FLOW
    %% ============================================
    UI <-->|Send Text / SSE| AGENT

    %% ============================================
    %% MCP & PERSISTENCE
    %% ============================================
    AGENT <-->|Tool Calls| MCPSERVER
    MCPSERVER <-->|Query Profile/Data| DB
    AGENT -->|Save Msgs| HISTORY
    HISTORY <-->|Read / Write| DB
