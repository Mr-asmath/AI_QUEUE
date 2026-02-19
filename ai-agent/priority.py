def calculate_priority(age, emergency, waiting_time, token_type="regular"):
    """
    Calculate priority score with multiple factors
    """
    score = 0
    
    # Emergency cases get highest priority
    if emergency:
        score += 100
    
    # Senior citizens priority
    if age >= 65:
        score += 30
    elif age >= 50:
        score += 15
    
    # Children priority
    if age <= 10:
        score += 25
    
    # Waiting time factor (increases over time)
    score += waiting_time * 3
    
    # Token type adjustment
    if token_type == "vip":
        score += 50
    elif token_type == "regular":
        score += 0
    
    # Cap the score to prevent overflow
    return min(score, 200)