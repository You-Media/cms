"use client";

import { useForm } from "@refinedev/react-hook-form";
import { Button, Card, Input, Typography, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { API_CONFIG } from "../config/api";
import { useState } from "react";

const { Title, Text } = Typography;

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onSubmit",
  });

  const onSubmit: (data: LoginFormData) => Promise<void> = async (data) => {
    setIsSubmitted(true);
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        message.success("Login effettuato con successo!");
        localStorage.setItem("authToken", result.access_token);
      } else if (response.status === 422) {
        message.error("Credenziali non valide. Riprova.");
      } else {
        message.error("Errore durante il login. Riprova.");
      }
    } catch (error) {
      console.error("Errore durante il login:", error);
      message.error("Errore di connessione. Verifica la tua connessione.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8" style={{ boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
        <div className="text-center">
          <Title level={2} className="text-gray-900">
            Accedi al CMS
          </Title>
          <Text type="secondary">
            Inserisci le tue credenziali per accedere
          </Text>
        </div>

        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
          <div>
            <Input
              {...register("email", {
                required: "L'email è obbligatoria",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Inserisci un'email valida",
                },
              })}
              size="large"
              placeholder="Email"
              prefix={<UserOutlined {...({} as any)} />}
              status={isSubmitted && errors.email ? "error" : ""}
            />
            {isSubmitted && errors.email && (
              <Text type="danger" className="text-sm mt-1 block">
                {typeof errors.email.message === "string" ? errors.email.message : null}
              </Text>
            )}
          </div>

          <div>
            <Input.Password
              {...register("password", {
                required: "La password è obbligatoria",
                minLength: {
                  value: 6,
                  message: "La password deve essere di almeno 6 caratteri",
                },
              })}
              size="large"
              placeholder="Password"
              prefix={<LockOutlined {...({} as any)} />}
              status={isSubmitted && errors.password ? "error" : ""}
            />
            {isSubmitted && errors.password && (
              <Text type="danger" className="text-sm mt-1 block">
                {typeof errors.password.message === "string" ? errors.password.message : null}
              </Text>
            )}
          </div>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={isSubmitting}
            className="w-full"
            style={{ height: "48px" }}
          >
            {isSubmitting ? "Accesso in corso..." : "Accedi"}
          </Button>
        </form>

        <div className="text-center">
          <Text type="secondary" className="text-sm">
            Non hai un account?{" "}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Contatta l'amministratore
            </a>
          </Text>
        </div>
      </Card>
    </div>
  );
}; 