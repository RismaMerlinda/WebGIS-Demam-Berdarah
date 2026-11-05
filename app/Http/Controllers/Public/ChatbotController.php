<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Services\Chatbot\ChatbotService;
use App\Services\Chatbot\GroqClientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ChatbotController extends Controller
{
    protected ChatbotService $chatbotService;
    protected GroqClientService $groqClient;

    public function __construct(ChatbotService $chatbotService, GroqClientService $groqClient)
    {
        $this->chatbotService = $chatbotService;
        $this->groqClient = $groqClient;
    }

    /**
     * Check chatbot service status and model readiness.
     */
    public function status(): JsonResponse
    {
        $health = $this->groqClient->checkHealth();

        return response()->json([
            'success' => true,
            'name' => 'Asisten WebGIS DBD Banyumas',
            'is_online' => $health['is_online'],
            'is_configured' => $health['is_configured'],
            'state' => $health['state'],
            'status_label' => $health['status_label'],
            'model' => $health['model'],
            'model_verified' => $health['model_verified'] ?? null,
            'message' => $health['message'],
        ]);
    }

    /**
     * Send message to the AI Chatbot assistant.
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'message' => ['required', 'string', 'min:1', 'max:500'],
            'conversation_id' => ['nullable', 'string', 'max:64'],
            'history' => ['nullable', 'array', 'max:10'],
            'history.*.role' => ['required_with:history', 'string', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:600'],
        ], [
            'message.required' => 'Pesan tidak boleh kosong.',
            'message.max' => 'Pesan terlalu panjang (maksimal 500 karakter).',
            'history.*.role.in' => 'Format riwayat percakapan tidak valid.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $message = (string) $request->input('message');
        $conversationId = $request->input('conversation_id');
        $history = (array) $request->input('history', []);

        $result = $this->chatbotService->processMessage($message, $conversationId, $history);

        $httpStatus = isset($result['status_code']) ? (int) $result['status_code'] : ($result['success'] ? 200 : 500);
        unset($result['status_code']);

        return response()->json($result, $httpStatus);
    }
}

