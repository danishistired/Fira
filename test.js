console.log("Loaded");

setTimeout(function () {
    console.log("typeof Java =", typeof Java);

    if (typeof Java !== "undefined") {
        Java.perform(function () {
            console.log("Java works!");
        });
    } else {
        console.log("Java missing");
    }
}, 5000);