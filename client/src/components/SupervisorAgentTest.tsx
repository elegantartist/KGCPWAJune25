/**
 * Supervisor Agent Test Component
 * For testing Phase 2 AI orchestration functionality
 */

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Shield, CheckCircle } from "lucide-react";

interface SupervisorResponse {
  success: boolean;
  data?: {
    response: string;
    sessionId: string;
    modelUsed: string;
    validationStatus?: string;
    toolsUsed?: string[];
    processingTime: number;
  };
  message?: string;
  timestamp: string;
}

export default function SupervisorAgentTest() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<SupervisorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [requiresValidation, setRequiresValidation] = useState(false);

  const testQueries = [
    "I'm feeling motivated today, what's a good meal idea?",
    "I've been feeling stressed lately, any wellness activities you recommend?",
    "How can I stay consistent with my health plan?",
    "What should I do about my medication schedule?"
  ];

  const sendQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/v2/supervisor/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userQuery: query,
          requiresValidation,
          sessionId: crypto.randomUUID()
        })
      });

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      setResponse({
        success: false,
        message: 'Failed to connect to Supervisor Agent',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const getModelBadgeColor = (model: string) => {
    switch (model) {
      case 'gpt-4': return 'bg-blue-500';
      case 'claude-3-sonnet': return 'bg-purple-500';
      case 'tool-based': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getValidationBadgeColor = (status?: string) => {
    switch (status) {
      case 'validated-approved': return 'bg-green-500';
      case 'validated-with-concerns': return 'bg-yellow-500';
      case 'validated-rejected': return 'bg-red-500';
      case 'not-required': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            Supervisor Agent Test (Phase 2)
          </CardTitle>
          <CardDescription>
            Test the AI orchestration system with secure PII/PHI protection and multi-model validation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Test Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Test Queries:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {testQueries.map((testQuery, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuery(testQuery)}
                  className="text-left justify-start h-auto p-3"
                >
                  {testQuery}
                </Button>
              ))}
            </div>
          </div>

          {/* Query Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Query:</label>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your health plan, request meal ideas, or seek wellness guidance..."
              rows={3}
            />
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="validation"
              checked={requiresValidation}
              onChange={(e) => setRequiresValidation(e.target.checked)}
            />
            <label htmlFor="validation" className="text-sm">
              Force multi-model validation
            </label>
          </div>

          {/* Send Button */}
          <Button
            onClick={sendQuery}
            disabled={!query.trim() || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing with AI...
              </>
            ) : (
              'Send to Supervisor Agent'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Response Display */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {response.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Shield className="h-5 w-5 text-red-500" />
              )}
              Supervisor Agent Response
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {response.data?.modelUsed && (
                <Badge className={getModelBadgeColor(response.data.modelUsed)}>
                  {response.data.modelUsed}
                </Badge>
              )}
              {response.data?.validationStatus && (
                <Badge className={getValidationBadgeColor(response.data.validationStatus)}>
                  {response.data.validationStatus}
                </Badge>
              )}
              {response.data?.toolsUsed && response.data.toolsUsed.length > 0 && (
                <Badge variant="outline">
                  Tools: {response.data.toolsUsed.join(', ')}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {response.success ? (
              <>
                {/* AI Response */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-900">{response.data?.response}</p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Session ID:</span>
                    <br />
                    {response.data?.sessionId?.substring(0, 8)}...
                  </div>
                  <div>
                    <span className="font-medium">Processing Time:</span>
                    <br />
                    {response.data?.processingTime}ms
                  </div>
                  <div>
                    <span className="font-medium">Timestamp:</span>
                    <br />
                    {new Date(response.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </>
            ) : (
              <Alert>
                <AlertDescription>
                  {response.message || 'An error occurred'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-800 font-medium">Security Features Active</span>
          </div>
          <ul className="text-xs text-green-700 mt-2 space-y-1">
            <li>• PII/PHI automatically redacted before processing</li>
            <li>• Multi-model validation for sensitive queries</li>
            <li>• Care plan directive adherence checking</li>
            <li>• Type 1 SaMD compliance boundaries enforced</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}