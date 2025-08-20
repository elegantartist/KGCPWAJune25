/**
 * DoctorChat.js - Doctor-Facing Intelligence Interface
 * 
 * This specialized interface allows doctors to generate Patient Progress Reports
 * and receive CPD optimization recommendations using the MCP architecture.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send, Loader2, FileText, TrendingUp, Users } from 'lucide-react';
import { routeRequest, getAvailableTools } from '@/components/mcp_client/router.js';
import { apiRequest } from '@/lib/queryClient';

export default function DoctorChat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [patients, setPatients] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [doctorId] = useState(1); // Default doctor ID
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load doctor's patients
  useEffect(() => {
    loadDoctorPatients();
  }, []);

  /**
   * Load patients assigned to this doctor
   */
  const loadDoctorPatients = async () => {
    try {
      const response = await apiRequest(`/api/doctors/${doctorId}/patients`);
      setPatients(response.patients || []);
    } catch (error) {
      console.error('[DoctorChat] Error loading patients:', error);
      // Fallback mock data for demo
      setPatients([
        { id: 1, firstName: 'John', lastName: 'Smith' },
        { id: 2, firstName: 'Sarah', lastName: 'Johnson' },
        { id: 3, firstName: 'Michael', lastName: 'Brown' }
      ]);
    }
  };

  /**
   * Handle PPR generation request
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
      patientId: selectedPatient
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Doctor-specific context for PPR generation
      const doctorContext = {
        userId: doctorId,
        userRole: 'doctor',
        patientId: parseInt(selectedPatient),
        requestType: 'ppr_analysis'
      };

      // Use MCP routing for doctor intelligence
      const response = await routeRequest(
        'ppr_analysis',
        inputValue,
        doctorContext
      );

      const assistantMessage = {
        id: Date.now() + 1,
        text: response,
        isUser: false,
        timestamp: new Date(),
        type: 'ppr_analysis'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('[DoctorChat] Error generating PPR:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I encountered an issue generating the Patient Progress Report. Please try again or contact system support.",
        isUser: false,
        timestamp: new Date(),
        type: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  /**
   * Quick PPR generation buttons
   */
  const generateQuickPPR = async (analysisType) => {
    if (!selectedPatient) {
      alert('Please select a patient first');
      return;
    }

    const quickMessages = {
      'comprehensive': 'Generate comprehensive Patient Progress Report',
      'cpd_optimization': 'Analyze CPD effectiveness and recommend updates',
      'compliance_focus': 'Focus on medication, diet, and exercise compliance analysis',
      'engagement_analysis': 'Analyze patient engagement and sentiment patterns'
    };

    setInputValue(quickMessages[analysisType]);
    setTimeout(() => handleSendMessage(), 100);
  };

  /**
   * Handle Enter key press
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Doctor Intelligence Center</h2>
        </div>
        <div className="text-sm text-muted-foreground">
          PPR Analysis & CPD Optimization
        </div>
      </div>

      {/* Patient Selection */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Select Patient:</label>
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choose a patient..." />
            </SelectTrigger>
            <SelectContent>
              {patients.map(patient => (
                <SelectItem key={patient.id} value={patient.id.toString()}>
                  {patient.firstName} {patient.lastName} (ID: {patient.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedPatient && (
            <div className="flex gap-2 ml-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => generateQuickPPR('comprehensive')}
                disabled={isTyping}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Full PPR
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => generateQuickPPR('cpd_optimization')}
                disabled={isTyping}
              >
                <Users className="h-4 w-4 mr-1" />
                CPD Analysis
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Doctor Intelligence Center</p>
            <p className="text-sm mb-4">Select a patient and request analysis to generate Patient Progress Reports with CPD recommendations.</p>
            
            <Card className="max-w-md mx-auto text-left">
              <CardHeader>
                <CardTitle className="text-sm">Available Analysis Types:</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div>• <strong>Comprehensive PPR</strong> - Complete patient analysis with all metrics</div>
                <div>• <strong>CPD Optimization</strong> - Focus on Care Plan Directive effectiveness</div>
                <div>• <strong>Compliance Analysis</strong> - Medication, diet, exercise adherence patterns</div>
                <div>• <strong>Engagement Analysis</strong> - Patient interaction and sentiment trends</div>
              </CardContent>
            </Card>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-[80%] ${
              message.isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              <CardContent className="p-3">
                {message.type === 'ppr_analysis' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium text-sm">Patient Progress Report</span>
                    </div>
                    <pre className="text-xs whitespace-pre-wrap font-mono bg-white/10 p-2 rounded">
                      {message.text}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                  {message.patientId && ` • Patient ID: ${message.patientId}`}
                </p>
              </CardContent>
            </Card>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Analyzing patient data and generating report...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Request patient analysis (e.g., 'Generate comprehensive PPR for medication compliance trends')"
            className="flex-1 min-h-[60px] resize-none"
            disabled={isTyping || !selectedPatient}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping || !selectedPatient}
            size="lg"
            className="px-6"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {!selectedPatient && (
          <p className="text-xs text-muted-foreground mt-2">
            Select a patient above to begin analysis
          </p>
        )}
      </div>
    </div>
  );
}