package com.schoolbus.livetracking.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register the STOMP endpoint that the client will use to connect.
        // We allow all origins for the POC and configure SockJS fallback options.
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Enable a simple memory-based message broker to send messages back to the client.
        // Client subscribes to "/topic/..." to receive location updates.
        registry.enableSimpleBroker("/topic");

        // Prefix for messages bound for @MessageMapping-annotated methods on controllers.
        registry.setApplicationDestinationPrefixes("/app");
    }
}
