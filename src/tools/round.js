ggd3.tools.round = function round(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
};
