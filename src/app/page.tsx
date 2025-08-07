"use client";
import React, { useState, useEffect } from "react";
import {
  Sparkles,
  MessageSquare,
  Volume2,
  Zap,
  Wallet,
  CheckCircle,
  ArrowRight,
  Brain,
  Globe,
  Shield,
} from "lucide-react";
import { redirect } from "next/navigation";

const AiMarketplaceLanding = () => {
  const [activeService, setActiveService] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const services = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: "Image Generation",
      description:
        "Transform your imagination into stunning visuals with state-of-the-art AI models.",
      example: "A cyberpunk cityscape at midnight with neon lights",
      features: ["DALL-E 3", "Midjourney", "Stable Diffusion"],
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Text Summarization",
      description:
        "Distill complex documents into clear, actionable insights in seconds.",
      example: "Summarize this 50-page research paper on AI ethics",
      features: [
        "Multi-format support",
        "Key insights extraction",
        "Custom length",
      ],
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: <Volume2 className="w-8 h-8" />,
      title: "Text-to-Speech",
      description:
        "Convert any text into natural, human-like speech with emotion and clarity.",
      example: "Read this article in a professional British accent",
      features: ["Multiple voices", "Emotion control", "Speed adjustment"],
      gradient: "from-green-500 to-teal-500",
    },
  ];
  const handleClick = () => {
    redirect("/marketplace");
  };

  const steps = [
    {
      icon: <Wallet className="w-6 h-6" />,
      title: "Top Up Your Account",
      description:
        "Deposit tMETIS into your secure marketplace account to get started.",
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Describe Your Task",
      description:
        "Type any request into our chat interface—from generating images to summarizing documents.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Confirm & Pay",
      description:
        "Our AI router finds the best service for your task. Confirm the price to execute instantly.",
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Receive Your Result",
      description:
        "Get your AI-generated content delivered directly back to you in the chat.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"
          style={{
            left: mousePosition.x / 10,
            top: mousePosition.y / 10,
            transform: "translate(-50%, -50%)",
          }}
        />
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-bounce" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse" />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium">
                Decentralized AI Network
              </span>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent leading-tight">
              The Future of
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                AI Services
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed max-w-3xl mx-auto">
              Access a global network of cutting-edge AI models for any task,
              and pay instantly with crypto. Experience the power of
              decentralized artificial intelligence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
              onClick={handleClick}
            >
              <span className="flex items-center gap-2">
                Launch App
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Get started with AI services in four simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full hover:bg-white/10 transition-all duration-300 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/20">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-6 h-6 text-purple-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Services Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Powerful AI Services
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Access cutting-edge AI models for all your creative and analytical
              needs
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className={`group cursor-pointer transition-all duration-500 transform hover:scale-105 ${
                  activeService === index ? "scale-105" : ""
                }`}
                onMouseEnter={() => setActiveService(index)}
              >
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 h-full hover:bg-white/10 transition-all duration-300 hover:border-white/20 hover:shadow-2xl">
                  <div
                    className={`bg-gradient-to-r ${service.gradient} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform duration-300`}
                  >
                    {service.icon}
                  </div>

                  <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    {service.description}
                  </p>

                  <div className="bg-black/20 rounded-xl p-4 mb-6 border-l-4 border-gradient-to-r from-purple-500 to-pink-500">
                    <p className="text-sm text-cyan-300 font-mono">
                      "{service.example}"
                    </p>
                  </div>

                  <div className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-gray-400"
                      >
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <button
                    className="mt-6 w-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/40 hover:to-pink-600/40 border border-purple-500/30 py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg"
                    onClick={handleClick}
                  >
                    Try Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Built for Trust & Scale
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Enterprise-grade security meets decentralized innovation
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="w-8 h-8" />,
                title: "Secure & Private",
                description:
                  "End-to-end encryption with zero data retention policies",
              },
              {
                icon: <Globe className="w-8 h-8" />,
                title: "Global Network",
                description:
                  "Distributed infrastructure across multiple continents",
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Lightning Fast",
                description:
                  "Sub-second response times with intelligent load balancing",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:border-green-500/50"
              >
                <div className="bg-gradient-to-r from-green-500 to-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-white mx-auto">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm border border-purple-500/20 rounded-3xl p-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your Ideas?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of creators, developers, and businesses already
              using our AI marketplace
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                className="group bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-12 py-4 rounded-full font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
                onClick={handleClick}
              >
                <span className="flex items-center gap-2">
                  Launch App Now
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AiMarketplaceLanding;
