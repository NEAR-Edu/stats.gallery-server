module.exports = {
  humanizeLevel(level) {
    switch (level) {
      case 1:
        return 'Beginner';
      case 2:
        return 'Rookie';
      case 3:
        return 'Squire';
      case 4:
        return 'Apprentice';
      case 5:
        return 'Knight';
      case 6:
        return 'Warrior';
      case 7:
        return 'Veteran';
      case 8:
        return 'Ninja';
      case 9:
        return 'Elite';
      default:
        return 'Nearkat';
    }
  },
};
